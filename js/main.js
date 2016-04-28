var g_download_dir = 'nfndz_garmin_logs';
var g_start_date;
var g_end_date;
var g_all_activity_ids = [];
var g_all_activity_dict = {};
var g_cur_downloading_activity_id = 0;
var g_cur_date;

// the date of the currently downloading activities
var g_downloading_cur_date;
// the index of the currently downloading activities
// in current date. There might be several activites 
// within one day.
var g_downloading_cur_idx = 0;
var g_cur_downloading_activity_fn = '';
var g_cur_downloading_activity_fullpath = '';
var g_last_downloaded_id = -1;

function update_indicating_text(_text) {
  $("#pbar0 > p").text(_text);
}

function update_milestone_text(_html, success) {
  if (success) {
    $('#total_activities_show').addClass('alert-success').removeClass('alert-danger');
  } else {
    $('#total_activities_show').addClass('alert-danger').removeClass('alert-success');
  }
  $('#total_activities_show').html(_html).show();
}

function update_download_bar(percentage, _text) {
  $('#download_activity > p').text(_text);
  $('div#download_bar').width(percentage+'%');
  $('div#download_bar').text(percentage+'%');
  $('#download_activity').show();
}

function _reset() {
  g_start_date = 0;
  g_end_date = 0;
  g_all_activity_ids = [];
  g_all_activity_dict = {};
  g_cur_downloading_activity_id = 0;
  enable_form();
  $("#pbar0").hide();
  $('#download_activity').hide();
  $('#sync_bar').hide();
  g_downloading_cur_date = 0;
  g_downloading_cur_idx = 0;
  g_cur_downloading_activity_fn = '';
  g_cur_downloading_activity_fullpath = '';
  //g_last_downloaded_id = -1;
}

function register_chrome_download_oncreated_cb() {
  chrome.downloads.onCreated.addListener(function(downloadItem) {
    g_cur_downloading_activity_id++;
    download_activities();
  });
}

function register_chrome_download_onchanged_cb() {
  chrome.downloads.onChanged.addListener(function(downloadDelta) {
    console.log(downloadDelta);
    if ('state' in downloadDelta && downloadDelta['state']['current'] == 'complete') {
      // first see whether we should sync to Runningahead
      
      // then download a new activity
      g_cur_downloading_activity_id++;
      g_last_downloaded_id = downloadDelta['id'];
      download_activities();
    }
    if ('filename' in downloadDelta && downloadDelta['filename']['current'].indexOf(g_download_dir) > -1) {
      g_cur_downloading_activity_fullpath = downloadDelta['filename']['current'];
      // indicating the start of the downloading...
      // we probably can start the next downloading...
      // g_cur_downloading_activity_id++;
      // download_activities();
    }
  });
}

function get_activity_tcx(_activity_id, date) {
  var garmin_activity_tcx_url = 'https://connect.garmin.com/modern/proxy/activity-service-1.1/tcx/activity/activity_id?full=true';
  g_cur_downloading_activity_fn = 'activity_'+_activity_id+'.tcx';
  if ($('input[type=radio][name=logsfileopt]:checked').val() == 'option1') {
    if (moment(date).isSame(g_downloading_cur_date)) {
      g_downloading_cur_idx++;
    } else {
      g_downloading_cur_date = date;
      g_downloading_cur_idx = 0;
    }
    g_cur_downloading_activity_fn = date+'_'+g_downloading_cur_idx+'.tcx';
  }
  chrome.downloads.download({
    url: garmin_activity_tcx_url.replace('activity_id', _activity_id),
    //filename: 'nfndz_garmin_logs/'+output_fn+'.tcx',
    filename: g_download_dir+'/'+g_cur_downloading_activity_fn,
    conflictAction: 'overwrite'
  });
}

function download_activities() {
  if (g_cur_downloading_activity_id < g_all_activity_ids.length) {
    update_indicating_text(
      'Downloading Activity '
      +g_cur_downloading_activity_fn
      +' ('+(g_cur_downloading_activity_id+1)+'/'+g_all_activity_ids.length+')');
    update_download_bar( 
      ((g_cur_downloading_activity_id+1)*100.0/g_all_activity_ids.length).toFixed(0)
    );
    var cur_id = g_all_activity_ids[g_cur_downloading_activity_id];
    get_activity_tcx(cur_id, g_all_activity_dict[cur_id]);
  } else {
    update_milestone_text('<strong>ALL Works DONE!</strong>', 1);
    $('#show_downloaded_files_btn').show();
    _reset();
  }
}

/*****
* The CALLBACK function after getting all the activities of the month.
* mode: 0 - store all activities;
* mode: 1 - ignore the date before (for the starting month)
* mode: 2 - ignore the date after (for the ending month)
* mode: 3 - ignore the dates between (for the starting month and the ending month are the same)
******/
function store_activity_ids(all_activities_in_month, mode, date1, date2) {
  $.each(all_activities_in_month['calendarItems'], function(i, obj) {
    if (g_all_activity_ids.indexOf(obj.id) == -1 
      && moment(obj.date).isSameOrAfter(g_start_date) 
      && moment(obj.date).isSameOrBefore(g_end_date) 
    ) {
      var append = false;
      if (mode == 0) {
        // this is the intermediate month
        append = true;
      } else if (mode == 1) {
        // this is the starting month
        if (moment(obj.date).isSameOrAfter(date1)) {
          append = true;
        }
      } else if (mode == 2) {
        // this is the ending month
        if (moment(obj.date).isSameOrBefore(date1)) {
          append = true;
        }
      } else if (mode == 3) {
        // this is both the starting month and the ending month, i.e. they are the same
        if (moment(obj.date).isBetween(date1, date2, null, '[]')) {
          append = true;
        }
      }  
      if (append) {
        g_all_activity_ids.push(obj.id);
        g_all_activity_dict[obj.id] = obj.date;
      }
    }
  });
}

/*****
* 
******/
function get_all_activities_of_the_month(year, month, mode, date1, date2) {
  var garmin_month_activities_list_url = 'https://connect.garmin.com/proxy/calendar-service/year/year_input/month/month_input';
  $.getJSON(garmin_month_activities_list_url.replace('year_input', year).replace('month_input', month), 
    { _: new Date().getTime() })
    .done(function(data) {
      //toastr.success('success!');
      update_indicating_text('Getting Activities of '+year+'/'+(month+1));
      store_activity_ids(data, mode, date1, date2);
      g_cur_date.add(1, 'months');
      if (g_cur_date.isSame(g_end_date, 'month')) {
        get_all_activities_of_the_month(g_cur_date.year(), g_cur_date.month(), 2, g_end_date);
      } else if (g_cur_date.isBefore(g_end_date, 'month') ) {
        get_all_activities_of_the_month(g_cur_date.year(), g_cur_date.month(), 0, g_cur_date);
      } else {
        // We are done!
        update_milestone_text('<strong>'+g_all_activity_ids.length+'</strong> activities were found.', 1);
        update_indicating_text('Downloading and Synchronizing the Activities...');
        download_activities();
      }
    })
    .fail(function() {
      toastr.error('Cannot get activities from Garmin. Please log in to Garmin Connect first.');
      update_milestone_text('Cannot get activities from Garmin. Please log in to Garmin Connect first.', 0);
      _reset();
    })
    .always(function() {
      
  });  
}

/*****
* We first need to get all activities id from Garmin.
* Please note that for Garmin, the activities are grouped by month not by day or activity.
* So we first get all activities in the month and read through them and get the activites 
* in the right range.
******/
function get_all_garmin_activities_id(start_date, end_date) {
  g_start_date = moment(start_date);
  g_end_date = moment(end_date);
  var start_year = g_start_date.year();
  var start_month = g_start_date.month();
  var end_year = g_end_date.year();
  var end_month = g_end_date.month();

  g_cur_date = moment(start_date);
  if (g_cur_date.isSame(g_end_date, 'month')) {
    get_all_activities_of_the_month(
      g_cur_date.year(), g_cur_date.month(), 3, g_start_date, g_end_date);
  } else {
    get_all_activities_of_the_month(g_cur_date.year(), g_cur_date.month(), 1, g_start_date);
  }
}

function register_action_btn() {
  $('#sync_btn').on('click', function (e) {
    e.preventDefault();
    var start_date = $("#start_date").val();
    var end_date = $("#end_date").val();
    disable_form();
    $("#pbar0").show();
    $('#total_activities_show').hide();
    get_all_garmin_activities_id(start_date, end_date);
  });
}

function enable_form() {
  $('#sync_btn').find("i").remove();
  $('#sync_btn').prop("disabled", false); 
  $("input[name=start_date]").prop('disabled', false);
  $("input[name=end_date]").prop('disabled', false);
  $("input[name=logsfileopt]").prop('disabled', false);
}

function disable_form() {
  $('#sync_btn').prepend('<i class="fa fa-circle-o-notch fa-spin fa-fw"></i>');
  $('#sync_btn').prop("disabled", true);
  $("input[name=start_date]").prop('disabled', true);
  $("input[name=end_date]").prop('disabled', true);
  $("input[name=logsfileopt]").prop('disabled', true);
}

function register_form_validator() {
  $('#main-form')
  .bootstrapValidator({
    feedbackIcons: {
      valid: 'glyphicon glyphicon-ok',
      invalid: 'glyphicon glyphicon-remove',
      validating: 'glyphicon glyphicon-refresh'
    },
    fields: {
      start_date: {
        validators: {
          notEmpty: {
            message: 'Start Date CANNOT be empty!'
          },
          date: {
            format: 'MM/DD/YYYY',
            message: 'Date format must be MM/DD/YYYY'
          }
        }
      },
      end_date: {
        validators: {
          callback: {
            callback: function(value, validator, $field) {
              var StartTimeDOM = $('#start_date');
              var StartTime = $('#start_date').val();
              if (!StartTime) {
                return {valid:false, message:"End Date MUST BE later than Start Date"};
              }

              var isAfterStartTime = moment(value).isSameOrAfter(moment(StartTime));

              if (isAfterStartTime) {
                  return true;
              } else {
                  return {valid:false, message:"End Date MUST BE later than Start Date"};
              }
            }
          },
          notEmpty: {
            message: 'End Date CANNOT be empty!'
          },
          date: {
            format: 'MM/DD/YYYY',
            message: 'Date format must be MM/DD/YYYY'
          }
        }
      }
    }
  });

  $('#start_date').on('dp.change dp.show', function(e) {
    $('#main-form').bootstrapValidator('revalidateField', 'start_date');
  });

  $('#end_date').on('dp.change dp.show', function(e) {
    $('#main-form').bootstrapValidator('revalidateField', 'end_date');
  });
}

function register_datepicker_events() {
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      autoclose: true,
    }).on('changeDate', function(e) {
      $('#main-form').bootstrapValidator('revalidateField', 'start_date');
      $('#main-form').bootstrapValidator('revalidateField', 'end_date');
    })
  });
}

function register_show_download_folder_btn() {
  $('#show_downloaded_files_btn').on('click', function() {
    chrome.downloads.show(g_last_downloaded_id);
  });
}

$( document ).ready(function() {
  toastr.options = {
    "closeButton": true,
    "debug": false,
    "progressBar": false,
    "positionClass": "toast-bottom-full-width",
    "onclick": null,
    "showDuration": "500",
    "hideDuration": "500",
    "timeOut": "3000",
    "extendedTimeOut": "500",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
  };
  register_action_btn();
  register_datepicker_events();
  register_form_validator();
  //register_chrome_download_oncreated_cb();
  register_chrome_download_onchanged_cb();
  register_show_download_folder_btn();
});
