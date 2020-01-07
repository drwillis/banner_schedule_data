
// Electrical and Computer Engineering
function filterCoursesECGR(course_dept_code, course_number, course_section) {
  //if (course_dept_code == 'ECGR') {
  //  if (course_number == '2161') {
  //    return true;
  //  } else {
  //    return false;
  //  }
  //}
  if (course_dept_code == 'ENGR') {
    if (course_number == '3295' && course_section.substring(0,1) == 'E') {
    } else if (course_number == '1202' && course_section.substring(0,1) == 'E') {
    } else {
      return true;
    }
  }
  return false;
}

// Mechanical Engineering
function filterCoursesMEGR(course_dept_code, course_number, course_section) {
  if (course_dept_code == 'ECGR') {
    if (course_number == '2161') {
      return false;
    } else {
      return true;
    }
  }
  if (course_dept_code == 'ENGR') {
    if (course_number == '3295' && course_section.substring(0,1) == 'M') {
    } else if (course_number == '1202' && course_section.substring(0,1) == 'M') {
    } else {
      return true;
    }
  }
  return false;
}

// Civil Engineering
function filterCoursesCEGR(course_dept_code, course_number, course_section) {
  if (course_dept_code == 'ENGR') {
    if (course_number == '3295' && course_section.substring(0,1) == 'C') {
    } else if (course_number == '1202' && course_section.substring(0,1) == 'C') {
    } else {
      return true;
    }
  }
  return false;
}
// Default
function filterCoursesDefault(course_dept_code, course_number, course_section) {
  return false;
}
