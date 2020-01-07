// Course class constructor and supporting functions
function Course(dept_code, numbers, section, crn, credit_hours, priority, expected_enrollment, not_simultaneous_courses, simultaneous_courses, required_rooms, excluded_rooms) {
  this.dept_code = dept_code
  this.numbers = numbers == null ? 0 : numbers.toString().split("/");
  this.section = section;
  this.crn = crn;
  this.credit_hours = credit_hours;
  this.priority = priority;
  this.expected_enrollment = expected_enrollment;
  this.not_simultaneous_courses = not_simultaneous_courses;
  this.simultaneous_courses = simultaneous_courses;
  this.required_rooms = required_rooms;
  this.excluded_rooms = excluded_rooms;
}

// Course::getId() function
Course.prototype.getId = function() {
  //return this.dept_code + " " + this.number + "-" + FormatNumberLength(this.section, 2);
  return this.dept_code + " " + this.numbers.join("/") + "-" + this.section;
}

var COURSE_NUMBER_SPECIAL_TOPICS_UNDERGRAD = 4090;
var COURSE_NUMBER_SPECIAL_TOPICS_GRAD = 6090;

// Course::equals() function
Course.prototype.equals = function(other_course) {
  if (this.numbers[0] == COURSE_NUMBER_SPECIAL_TOPICS_UNDERGRAD || 
      this.numbers[0] == COURSE_NUMBER_SPECIAL_TOPICS_GRAD) {
    return this.dept_code == other_course.dept_code && this.numbers[0] == other_course.numbers[0] && this.section == other_course.section;      
  } else {
    return this.dept_code == other_course.dept_code && this.numbers[0] == other_course.numbers[0];
  }
}

// boolean to detect special topics courses
Course.prototype.isSpecialTopics = function() {
  return /[3.4.5,6,8]090/.test(this.getId());
  //return this.getId().indexOf('090') >= 0;
}

// Course::notSimultaneousConflict()
// detects courses that conflict, i.e., course pairs that are preferred to NOT be taught simultaneously
Course.prototype.notSimultaneousConflict = function(course_to_check) {
  var conflict = false;
  for (var notSimultaneousIdx = 0; conflict == false && notSimultaneousIdx < this.not_simultaneous_courses.length; notSimultaneousIdx++) {
    // do a regex pattern match here. For example, 3159's conflicts are 3???, 4???? indicating any 3XXX, 4XXX course is a conflict
    if (this.not_simultaneous_courses[notSimultaneousIdx].numbers[0].indexOf('?') >= 0) {
      var regexp_str = this.not_simultaneous_courses[notSimultaneousIdx].numbers[0].replace(/\?/g,'[0-9]?');
      var regexp = new RegExp(regexp_str);
      //var strt = course_to_check.numbers[0].toString();
      conflict = regexp.test(course_to_check.numbers[0]);
    } else {
      conflict =  this.not_simultaneous_courses[notSimultaneousIdx].equals(course_to_check);
    }
  }
  return conflict;
}

// Course::simultaneousPreference()
// detects course pairs that are preferred to be taught simultaneously
Course.prototype.simultaneousPreference = function(course_to_check) {
  var simultaneous = false;
  for (var simultaneousIdx = 0; simultaneous == false && simultaneousIdx < this.simultaneous_courses.length; simultaneousIdx++) {  
    simultaneous = this.simultaneous_courses[simultaneousIdx].equals(course_to_check);
  }
  return simultaneous;
}




