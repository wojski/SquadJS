export function GetTimeText(date) {
  if (new Date() - date > 0) {
    return '0 sec';
  }

  var timeDiff = Math.abs(new Date() - date);
  var seconds = Math.floor(timeDiff / 1000);

  if (seconds > 60) {
    return `${Math.floor(seconds / 60)} min`;
  } else {
    return `${seconds} sec`;
  }
}