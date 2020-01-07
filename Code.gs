// 
// This file is part of the UNCC ECE Scheduling Software and distributed 
// as a Google script embedded as part of a Google Sheets Spreadsheet
// Copyright (c) 2019 Andrew Willis, All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
//   * Redistributions of source code must retain the above copyright
//     notice, this list of conditions and the following GPL license text.
//
// This program is free software: you can redistribute it and/or modify  
// it under the terms of the GNU General Public License as published by  
// the Free Software Foundation, version 3.
// 
//  This program is distributed in the hope that it will be useful, but 
//  WITHOUT ANY WARRANTY; without even the implied warranty of 
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
//  General Public License for more details.
// 
//  You should have received a copy of the GNU General Public License 
//  along with this program. If not, see <http://www.gnu.org/licenses/>.
//

//
// The ECE Course Monitoring
// Andrew Willis
// October 28, 2019 v1.0
// November 8, 2019 v2.0

// HARD-CODED CONSTANTS
var SHEET_FIRST_DATA_ROW = 3;    
var SHEET_COLUMN_CRN         = 0;
var SHEET_COLUMN_DEPT_CODE   = 1;
var SHEET_COLUMN_NUMBER      = 2;
var SHEET_COLUMN_SECTION     = 3;
var SHEET_COLUMN_CREDIT_HRS  = 4;
var SHEET_COLUMN_TITLE       = 5;
var SHEET_COLUMN_ROOM        = 6;
var SHEET_COLUMN_TIME        = 7;
var SHEET_COLUMN_DAYS        = 8;
var SHEET_COLUMN_INSTRUCTOR  = 9;
var SHEET_COLUMN_STATUS      = 10;
var SHEET_COLUMN_CAPACITY    = 11;
var SHEET_COLUMN_ACTUAL      = 12;
var SHEET_COLUMN_REMAINING   = 13;

var STATUS_FULL_WARN_THRESHOLD  = 85;  // percent full
var STATUS_FULL_ALERT_THRESHOLD = 100; // percent full

var STATUS_COLOR_OK         = '#99cc99'; // green        - all letters should be lowercase
var STATUS_COLOR_FULL_ALERT = '#d26367'; // light red    - all letters should be lowercase 
var STATUS_COLOR_FULL_WARN  = '#fed8b1'; // light orange - all letters should be lowercase 
var STATUS_COLOR_NA         = '#add8e6'; // light blue   - all letters should be lowercase

var SHEET_NAME_CONFIG = 'Config';

var CONFIG_SHEET_ROW_DOWNLOAD       = 12;
var CONFIG_SHEET_MAILTOGGLE_ROWCOL  = [7,2];
var CONFIG_SHEET_MANAGER_DATA_RANGE = [9,1,2,2];
var CONFIG_SHEET_COLUMN_DOWNLOAD    = 0;
var CONFIG_SHEET_COLUMN_DEPTS       = 1;
var CONFIG_SHEET_COLUMN_SEMESTER    = 2;
var CONFIG_SHEET_COLUMN_YEAR        = 3;
var CONFIG_SHEET_COLUMN_YRSEMCODE   = 4;

var MAX_COLUMNS = 20;

var SEMESTER = 'Spring'
var YEAR = '2020';
var SCHEDULE_MANAGERS = ['Jim Conrad','Andrew Willis'];
var SCHEDULE_MANAGERS_EMAILS = ['jmconrad@uncc.edu','arwillis@uncc.edu'];

// Create google sheet menu items
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Schedule Engine')
  .addSeparator()
  .addSubMenu(ui.createMenu('Import')
              .addItem('Pull Banner Courses and Seat Availability', 'pullBannerClassScheduleData'))
  .addSubMenu(ui.createMenu('Debug')
              .addItem('Show Logs (not implemented)', 'showLogs'))
  .addToUi();
}

function pullBannerClassScheduleData() {
  var schedule = SpreadsheetApp.getActiveSpreadsheet();
  // Load Previous Banner Course Data (in spreadsheet)
  var config_sheet = schedule.getSheetByName(SHEET_NAME_CONFIG);
  var config_sheet_data = config_sheet.getDataRange().getValues();

  var mail_config_data = config_sheet_data.splice(0, CONFIG_SHEET_ROW_DOWNLOAD);
  var search_config_data = config_sheet_data;
  var searches_to_execute = [];
  for (var search_cfg_idx = 0; search_cfg_idx < search_config_data.length; search_cfg_idx++) {
    if (search_config_data[search_cfg_idx][CONFIG_SHEET_COLUMN_DOWNLOAD] == true) {
      searches_to_execute.push(search_cfg_idx);
    }
  }
    
  for (var search_idx = 0; search_idx < searches_to_execute.length; search_idx++) {
    var term_code = search_config_data[searches_to_execute[search_idx]][CONFIG_SHEET_COLUMN_YRSEMCODE];
    var dept_arr = search_config_data[searches_to_execute[search_idx]][CONFIG_SHEET_COLUMN_DEPTS].replace(/\s/g, "").split(',');
    var subject_code_array = ['dummy','ENGR'].concat(dept_arr);
    var semester = search_config_data[searches_to_execute[search_idx]][CONFIG_SHEET_COLUMN_SEMESTER];
    var year = search_config_data[searches_to_execute[search_idx]][CONFIG_SHEET_COLUMN_YEAR];
    var destination_sheet_name = dept_arr + ' ' + semester + ' ' + year;
    var filterType;
    switch(dept_arr[0]) {
      case 'ECGR':
        filterType = filterCoursesECGR;
        break;
      case 'MEGR':
        filterType = filterCoursesMEGR;
        break;
      case 'CEGR':
        filterType = filterCoursesCEGR;
        break;
      default:
        // code block
    }
    searchBannerClassScheduleData(semester, year, term_code, subject_code_array, destination_sheet_name, filterType);
  }
}

function searchBannerClassScheduleData(semester, year, term_code, subject_code_array, destination_sheet_name, filterfcn) {
  var schedule = SpreadsheetApp.getActiveSpreadsheet();
  // Load Previous Banner Course Data (in spreadsheet)
  var course_seats_sheet = schedule.getSheetByName(destination_sheet_name);

  // create sheet if missing
  if (!course_seats_sheet) {
    schedule.insertSheet(destination_sheet_name);
    course_seats_sheet = schedule.getSheetByName(destination_sheet_name);
  }
  
  // copy headers, column sizes, and alignments from config sheet
  var config_sheet = schedule.getSheetByName(SHEET_NAME_CONFIG);
  var config_sheet_header_range = config_sheet.getRange(1, 1, 2, MAX_COLUMNS)
  var config_sheet_header_data = config_sheet_header_range.getValues();
  course_seats_sheet.getRange(1, 1, 2, MAX_COLUMNS).setValues(config_sheet_header_data);
  config_sheet_header_range.copyFormatToRange(course_seats_sheet,1, 1, 1, 1);

  // get data if it exists
  var course_seats_datarange = course_seats_sheet.getDataRange();
  var prevCourseList = getExistingBannerCourses(course_seats_datarange);

  var bannerCourseList = 'https://selfservice.uncc.edu/pls/BANPROD/bwckschd.p_get_crse_unsec';
  var courseListFormData = {
    'term_in': term_code,
    'sel_subj': subject_code_array,
    'sel_day': 'dummy',
    'sel_schd': ['dummy', '%'],
    'sel_insm': ['dummy', '%'],
    'sel_camp': ['dummy', '%'],
    'sel_levl': ['dummy', '%'],
    'sel_sess': 'dummy',
    'sel_instr': 'dummy',
    'sel_ptrm': ['dummy','%'],
    'sel_attr': ['dummy','%'],
    'sel_crse': '',
    'sel_title': '',
    'sel_from_cred': '',
    'sel_to_cred': '',
    'begin_hh': '0',
    'begin_mi': '0',
    'begin_ap': 'a',
    'end_hh': '0',
    'end_mi': '0',
    'end_ap': 'a'
  }

  var referer_url = 'https://selfservice.uncc.edu/pls/BANPROD/bwckctlg.p_disp_cat_term_date';
  if (term_code % 60 == 0) { // detect "Summer (View Only)" requests which need a different header 
    referer_url = 'https://selfservice.uncc.edu/pls/BANPROD/bwckgens.p_proc_term_date';
  }

  var headers = { 
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Origin': 'https://selfservice.uncc.edu',
    'Referer': referer_url
  }          
  var query = makeURLEncodedStringWithArrays(courseListFormData);
  var courseListFormOptions = {
    'method' : 'POST',
    'headers' : headers,
    'contentType' : 'application/x-www-form-urlencoded',
    'payload' : query,
    'followRedirects' : true,
    'muteHttpExceptions' : true    
  };
  var response = UrlFetchApp.fetch(bannerCourseList, courseListFormOptions);
  var webpage_txt = response.getContentText();
  
  var crn_numbers = [];
  var crn_str_idx_start = [];
  var banner_crn_arr = [];
  webpage_txt.replace(/crn_in=[\d]{5}/g, function( a,b ) {
    crn_str_idx_start.push(b);
    crn_numbers.push ( a.substring(a.length-5, a.length) ) ;
    banner_crn_arr.push(a);
  });

  crn_str_idx_start.push(webpage_txt.length);
  var course_credit_hrs = [];
  var course_time_str = [];
  var course_days_str = [];
  var course_room_str = [];
  var course_instructor_str = [];
  for (var crnIdx = 0; crnIdx < crn_str_idx_start.length - 1; crnIdx++) {
    var courseStr = webpage_txt.substring(crn_str_idx_start[crnIdx], crn_str_idx_start[crnIdx+1]);
    var credits = courseStr.match(/[\d].[\d]{3} Credits/);
    var credit_num = '?';
    if (credits != null) {
      credit_num = parseFloat(credits[0].substring(0,5));
    }
    course_credit_hrs.push(credit_num);
    var tableStartOffsetIdx = courseStr.indexOf('<table  CLASS="datadisplaytable" SUMMARY="This table lists the scheduled meeting times and assigned instructors for this class..">');
    var fields = [];
    if (tableStartOffsetIdx >= 0) {
      var tableEndOffsetIdx = courseStr.indexOf('</table>',tableStartOffsetIdx);
      if (tableEndOffsetIdx >= 0) {
        courseStr = courseStr.substring(tableStartOffsetIdx, tableEndOffsetIdx);
        courseStr.replace(/<td CLASS="dddefault">(.*)<\/td>/g, function( a,b ) {
          b = b.replace(/&nbsp;/g,'');
          b = b.replace(/<[^>]+>/g,'');
          fields.push (b) ;
        });        
      }
    }
    if (fields.length == 7) {
      course_time_str.push([fields[1]]);
      course_days_str.push([fields[2]]);
      course_room_str.push([fields[3]]);
      course_instructor_str.push([fields[6]]);
    } else if (fields.length == 14) { 
      course_time_str.push([fields[1],fields[8]]);
      course_days_str.push([fields[2],fields[9]]);
      course_room_str.push([fields[3],fields[10]]);
      course_instructor_str.push([fields[6],fields[13]]);
    } else if (fields.length == 21) { 
      course_time_str.push([fields[1],fields[8],fields[15]]);
      course_days_str.push([fields[2],fields[9],fields[16]]);
      course_room_str.push([fields[3],fields[10],fields[17]]);
      course_instructor_str.push([fields[6],fields[13],fields[20]]);
    } else {
      course_time_str.push(['']);
      course_days_str.push(['']);
      course_room_str.push(['']);
      course_instructor_str.push(['']);        
    }    
  }

  var headers2 = { 
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Origin': 'https://selfservice.uncc.edu',
    'Referer': 'https://selfservice.uncc.edu/pls/BANPROD/bwckschd.p_get_crse_unsec'
  }  
  var bannerSeatQueryURL = 'https://selfservice.uncc.edu/pls/BANPROD/bwckschd.p_disp_detail_sched'; // add 'crn_in=23329' to end to get seats webpage for that crn
  var courseSeatListFormOptions = {
    'method' : 'GET',
    'headers' : headers2,
    'contentType' : 'application/x-www-form-urlencoded',
    'followRedirects' : true,
    'muteHttpExceptions' : true    
  };

  var courseQueryURL;
  var content = [];
  var newCourseList = [];
  var term_param = 'term_in=' + term_code;
  for (var course_idx = 0; course_idx < banner_crn_arr.length; course_idx++) {
    courseQueryURL = bannerSeatQueryURL + '?' + term_param + '&' + banner_crn_arr[course_idx];
    var row=[];
    
    var seat_html_response = UrlFetchApp.fetch(courseQueryURL, courseSeatListFormOptions);
    var doc = Xml.parse(seat_html_response, true);
    var bodyHtml = doc.html.body.toXmlString();
    doc = XmlService.parse(bodyHtml);
    var html = doc.getRootElement();    

    var courselabel = getElementsByClassName(html, 'datadisplaytable');
    var course_name_arr = getElementsByTagName(courselabel[0], 'th');   
    var course_name = course_name_arr[0].getText();
    var course_arr = course_name.split(/ - /); // title, crn, dept code & number, section
    //course_name = course_name.replace(/ /g,''); // remove space characters
    
    var course_title = course_arr[0].trim();
    var course_crn = parseFloat(course_arr[1].trim());
    var course_dept_code_and_number_arr = course_arr[2].trim().split(' ');
    var course_section = course_arr[3].trim();
    //if (course_dept_code_and_number_arr[1] == '1202') {
    //  var aa = 1;
    //}
    if (filterfcn(course_dept_code_and_number_arr[0], course_dept_code_and_number_arr[1], course_section)) {
      continue; // skip this course due to filtering function
    }
    
    row.push(crn_numbers[course_idx]);                        // CRN
    row.push(course_dept_code_and_number_arr[0]);             // COURSE DEPT CODE
    row.push(course_dept_code_and_number_arr[1]);             // COURSE NUMBER
    row.push(course_section);                                 // COURSE SECTION
    row.push(course_credit_hrs[course_idx]);                  // COURSE CREDIT HOURS
    row.push(course_title);                                   // COURSE TITLE
    row.push(course_room_str[course_idx].join(', '));         // COURSE ROOM
    row.push(course_time_str[course_idx].join(', '));         // COURSE TIME
    row.push(course_days_str[course_idx].join(', '));         // COURSE DAYS
    row.push(course_instructor_str[course_idx].join(', '));   // COURSE INSTRUCTOR
    
    row.push('');                                             // placeholder for STATUS COLUMN;
    
    var entries = getElementsByClassName(html, 'datadisplaytable');
    var vals = getElementsByTagName(entries[1], 'td');    
    for (var i = 1; i < vals.length; i++) {
      row.push(vals[i].getText());                            // SEAT OCCUPANCY DATA
      //Logger.log(vals[i].getText());
    } 
    while(row.length < MAX_COLUMNS) {
      row.push(''); // MAKE THE ARRAY SQUARE Nx(MAX_COLUMNS+1) (N rows, MAX_COLUMNS+1 columns)
    }
    content.push(row);    
    var newCourse = new Course(course_dept_code_and_number_arr[0], course_dept_code_and_number_arr[1], 
                                course_section, crn_numbers[course_idx], 0 /*total credit hours*/);
    newCourseList.push(newCourse);
  }

  content.sort(function(a, b) {
    if (a[SHEET_COLUMN_NUMBER] === b[SHEET_COLUMN_NUMBER]) {
        return 0;
    }
    else {
        return (a[SHEET_COLUMN_NUMBER] < b[SHEET_COLUMN_NUMBER]) ? -1 : 1;
    }
  });

  var colors = []

  // Write to sheets
  if (content.length > 0) {
    course_seats_sheet.getRange(SHEET_FIRST_DATA_ROW, 1, content.length, content[0].length).setValues(content);    
    //course_seats_sheet.getRange(SHEET_FIRST_DATA_ROW, SHEET_COLUMN_STATUS + 1, content.length, 1).setBackground(colors);
  }

  // Format the pasted values
  var config_sheet_column_formatting_data = config_sheet.getRange(SHEET_FIRST_DATA_ROW, 1, 2, MAX_COLUMNS).getValues();  
  var config_sheet_column_size_data = config_sheet_column_formatting_data[0];
  var config_sheet_column_align_data = config_sheet_column_formatting_data[1];
  for (var colIdx=0; colIdx < config_sheet_column_size_data.length; colIdx++) {
    course_seats_sheet.setColumnWidth(colIdx+1, config_sheet_column_size_data[colIdx]);
    var lr = course_seats_sheet.getLastRow();
    var r= course_seats_sheet.getRange(SHEET_FIRST_DATA_ROW, colIdx+1, lr, 1);
    var set=r.setHorizontalAlignment(config_sheet_column_align_data[colIdx]);
    course_seats_sheet.getRange(SHEET_FIRST_DATA_ROW, colIdx+1, lr, 1).setFontWeight( "normal" );
  }

  var status_change=[];
  for (var course_idx = 0; course_idx < content.length; course_idx++) {
    if (content[course_idx][SHEET_COLUMN_CAPACITY] != null && content[course_idx][SHEET_COLUMN_CAPACITY] > 0) {
      var pct_capacity = 100*content[course_idx][SHEET_COLUMN_ACTUAL]/content[course_idx][SHEET_COLUMN_CAPACITY];
      content[course_idx][SHEET_COLUMN_STATUS] = pct_capacity.toFixed(1);  //'% FULL';
      if (pct_capacity >= STATUS_FULL_ALERT_THRESHOLD) {
        colors.push(STATUS_COLOR_FULL_ALERT);
      } else if (pct_capacity >= STATUS_FULL_WARN_THRESHOLD) {
        colors.push(STATUS_COLOR_FULL_WARN);
      } else {
        colors.push(STATUS_COLOR_OK);
      }
    } else  {
      content[course_idx][SHEET_COLUMN_STATUS] = 'NA';
      colors.push(STATUS_COLOR_NA);
    }
    var prevColor = course_seats_sheet.getRange(SHEET_FIRST_DATA_ROW + course_idx, SHEET_COLUMN_STATUS + 1, 1, 1).getBackground();
    prevColor = prevColor.toLowerCase();
    colors[colors.length-1] = colors[colors.length-1].toLowerCase();
    var crn_prev = course_seats_sheet.getRange(SHEET_FIRST_DATA_ROW + course_idx, SHEET_COLUMN_CRN + 1, 1, 1).getValue();
    course_seats_sheet.getRange(SHEET_FIRST_DATA_ROW + course_idx, SHEET_COLUMN_STATUS + 1, 1, 1).setValue(content[course_idx][SHEET_COLUMN_STATUS]);
    var crn_current = parseFloat(content[course_idx][SHEET_COLUMN_CRN]);
    course_seats_sheet.getRange(SHEET_FIRST_DATA_ROW + course_idx, SHEET_COLUMN_STATUS + 1, 1, 1).setBackground(colors[colors.length-1]);
    if (crn_current == crn_prev && prevColor != colors[colors.length - 1] &&
         (prevColor == STATUS_COLOR_FULL_ALERT || prevColor == STATUS_COLOR_FULL_WARN || prevColor == STATUS_COLOR_OK || prevColor == STATUS_COLOR_NA)) {
      status_change.push(course_idx);
    }
  }  
  

  // Saturday, September 17, 2016  var today  = new Date();
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short'};
  var today  = new Date();
  course_seats_sheet.getRange(2, 1, 1, 1).setValue('Last update occured on '+today.toLocaleString("en-US", options));  
  //Logger.log(JSON.stringify(content));
  
  if (status_change.length == 0) {
    return;
  }
  
  // check if sending mail is enabled
  var config_sheet_send_mail = config_sheet.getRange(CONFIG_SHEET_MAILTOGGLE_ROWCOL[0], CONFIG_SHEET_MAILTOGGLE_ROWCOL[1], 1, 1).getValues()[0][0]
  if (!config_sheet_send_mail) {
    return; 
  }  

  // get the schedule manager(s) data
  var config_sheet_manager_data = config_sheet.getRange(CONFIG_SHEET_MANAGER_DATA_RANGE[0], CONFIG_SHEET_MANAGER_DATA_RANGE[1], 
                                                        CONFIG_SHEET_MANAGER_DATA_RANGE[2], CONFIG_SHEET_MANAGER_DATA_RANGE[3]).getValues();
  // Form letter email constants that change each semester / year
  // construct and send out emails
  var subjectStr = semester + ' ' + year + ' Banner Course Registration Status Update';
  var messagePreLine1;
  var messagePreLine2;

  messagePreLine1 = ['Dear ',null,',','\n'];
  messagePreLine2 = ['\n','Some courses have changed seat availability status in banner for ' + semester + ' ' + year + ':','\n'];
  // output a row in the email containing the following: Course Dept. Code, Course Number(s), Section, Time Slot, Days of the Week, Building, Room Number
  var messageStatusChangeList = ['\n',' CRN  ','                    COURSE DETAILS                                    ','PERCENT FULL','\n'];
  var messageStatusChangeListSize = [5,74,5];
  for (var statusChangeIdx = 0; statusChangeIdx < status_change.length; statusChangeIdx++) {
    var str_course_details = content[status_change[statusChangeIdx]][SHEET_COLUMN_CRN] + ' ' 
     + content[status_change[statusChangeIdx]][SHEET_COLUMN_DEPT_CODE] + ' '
     + content[status_change[statusChangeIdx]][SHEET_COLUMN_NUMBER] + '-'
     + content[status_change[statusChangeIdx]][SHEET_COLUMN_SECTION] + ' '     
     + content[status_change[statusChangeIdx]][SHEET_COLUMN_TITLE];

    while (str_course_details.length < messageStatusChangeListSize[0] + messageStatusChangeListSize[1]) {
      str_course_details = str_course_details + ' ';
    }       
    messageStatusChangeList.push(str_course_details);
    
    var pct_full = content[status_change[statusChangeIdx]][SHEET_COLUMN_STATUS];
        
    while (pct_full.length < messageStatusChangeListSize[2]) {
      pct_full = pct_full + ' ';
    }
    messageStatusChangeList.push(pct_full);
    messageStatusChangeList.push('\n');
  }
  
  for (var mgrIdx = 0; mgrIdx < config_sheet_manager_data.length; mgrIdx++) {
    var mgrEmail = config_sheet_manager_data[mgrIdx][1];
    var mgrName = config_sheet_manager_data[mgrIdx][0];
    // invalid email -- can improve this
    if (mgrEmail.indexOf('@') == -1) {
      continue;
    }
    var replyToStr = mgrEmail;
    var dstEmailAddress = mgrEmail;
    messagePreLine1[1] = mgrName;
    var mailMessage = messagePreLine1.join('') + messagePreLine2.join('') + messageStatusChangeList.join(' '); // Second column
    //if (dstEmailAddress == 'arwillis@uncc.edu') { // || dstEmailAddress == 'jmconrad@uncc.edu') {
    logLine = 'Sent status changed notification to ' + dstEmailAddress + '.';
    Logger.log(logLine);        
    // UNCOMMENT THE LINE BELOW TO SEND OUT EMAILS
    MailApp.sendEmail(dstEmailAddress, replyToStr, subjectStr, mailMessage);
    //}
  }
}

// retrieve Course data
function getExistingBannerCourses(course_datarange) {
  var COLUMN_INDEX_COURSE_CRN_NUMBER = 4;
  var ROW_INDEX_FIRST_COURSE = 2;
  
  var course_data = course_datarange.getValues();  
  var courseList=[];
  
  for (var rowIdx = ROW_INDEX_FIRST_COURSE; rowIdx < course_datarange.getHeight(); rowIdx++) {
      var dept_code = course_data[rowIdx][SHEET_COLUMN_DEPT_CODE];
      var numbers = course_data[rowIdx][SHEET_COLUMN_NUMBER] == null ? 0 : course_data[rowIdx][SHEET_COLUMN_NUMBER];
      var section = course_data[rowIdx][SHEET_COLUMN_SECTION];
      var crn = course_data[rowIdx][SHEET_COLUMN_CRN];
      var credit_hours = 0;
      var priority = 0;
      var expected_enrollment = 0;
      var not_simultaneous_courses = null;
      var simultaneous_courses = null;
      var these_rooms_only_ids = null;
      var excluded_rooms = null;
      var course = new Course(dept_code, numbers, section, crn, credit_hours, priority, expected_enrollment, 
                              not_simultaneous_courses, simultaneous_courses, these_rooms_only_ids, excluded_rooms);
      courseList.push(course);
  }    
  return courseList;
}

function pullBannerCourseCatalogSearchData() {
  //var bannerSelectTerm = 'https://selfservice.uncc.edu/pls/BANPROD/bwckctlg.p_disp_dyn_ctlg';
  //var bannerSelectTerm = 'https://selfservice.uncc.edu/pls/BANPROD/bwckctlg.p_disp_cat_term_date';
  //var url = ScriptApp.getService().getUrl(bannerSelectTerm);
  // Make a GET request and log the returned content.
  //var response = UrlFetchApp.fetch(bannerSelectTerm);
  //Logger.log(response.getContentText());
  // Make a POST request with form data.  
  //var termFormData = {
  //  'call_proc_in' : 'bwckctlg.p_disp_dyn_ctlg',
  //  'cat_term_in': '202010'
  //};
  // Because payload is a JavaScript object, it is interpreted as
  // as form data. (No need to specify contentType; it automatically
  // defaults to either 'application/x-www-form-urlencoded'
  // or 'multipart/form-data')
  //var options = {
  //  'method' : 'POST',
  //  'payload' : termFormData,
  //  'followRedirects' : true,
  //  'muteHttpExceptions' : true    
  //};
  //var response = UrlFetchApp.fetch(bannerSelectTerm, options);
  //Logger.log(response.getContentText());
  //Utilities.sleep(1);// pause in the loop for 200 milliseconds
  //var bannerAdvCourseList = 'https://selfservice.uncc.edu/pls/BANPROD/bwskfcls.P_GetCrse_Advanced';
  //var advCourseListFormData = {
  //  'rsts' : 'dummy',
  //  'crn' : 'dummy',
  //  'term_in' : '202010',
  //  'sel_subj' : 'ECGR;ENGR',
  //  'sel_day' : 'dummy',
  //  'sel_schd' : 'dummy',
  //  'sel_insm' : 'dummy',
  //  'sel_camp' : 'dummy',
  //  'sel_levl' : 'dummy',
  //  'sel_sess' : 'dummy',
  //  'sel_instr': 'dummy',
  //  'sel_ptrm' : 'dummy',
  //  'sel_attr' : 'dummy'
  //};
  //var advCourseListFormOptions = {
  //  'method' : 'POST',
  // 'payload' : advCourseListFormData,
  //  'followRedirects' : true,
  //  'muteHttpExceptions' : true    
  //};
  //var response2 = UrlFetchApp.fetch(bannerAdvCourseList, advCourseListFormOptions);
  //Logger.log(response2.getContentText());
  //Utilities.sleep(1);// pause in the loop for 200 milliseconds
  
  var bannerCourseList = 'https://selfservice.uncc.edu/pls/BANPROD/bwckctlg.p_display_courses'
  var courseListFormData = {
    'term_in': '202010',
    'call_proc_in': 'bwckctlg.p_disp_dyn_ctlg',
    'sel_subj': ['dummy','ECGR','ENGR'],
    'sel_levl': ['dummy','%'],
    'sel_schd': ['dummy','%'],
    'sel_coll': ['dummy','%'],
    'sel_divs': ['dummy','%'],
    'sel_dept': ['dummy','%'],
    'sel_attr': ['dummy','%'],
    'sel_crse_strt': '',
    'sel_crse_end': '',
    'sel_title': '',
    'sel_from_cred': '',
    'sel_to_cred': '',
   };
   var headers = { 
     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
     'Origin': 'https://selfservice.uncc.edu',
     'Referer': 'https://selfservice.uncc.edu/pls/BANPROD/bwckctlg.p_disp_cat_term_date'
   }          
   var query = makeURLEncodedStringWithArrays(courseListFormData);
   //Logger.log(query);
   var courseListFormOptions = {
     'method' : 'POST',
     'headers' : headers,
     'contentType' : 'application/x-www-form-urlencoded',
     'payload' : query,
     //'contentType' : 'application/json',
     //'payload' : JSON.stringify(courseListFormData),
     'followRedirects' : true,
     'muteHttpExceptions' : true    
   };   
   var response2 = UrlFetchApp.fetch(bannerCourseList, courseListFormOptions);
  
   Logger.log(response2.getContentText());
   Utilities.sleep(1);// pause in the loop for 200 milliseconds
}
