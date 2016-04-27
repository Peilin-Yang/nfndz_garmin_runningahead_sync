var g_start_date;
var g_end_date;
var g_all_activity_ids = [];
var g_cur_downloading_activity_id = 0;
var g_cur_date;

function _reset() {
  g_all_activity_ids = [];
  g_cur_downloading_activity_id = 0;
  enable_sync_btn();
  $("#pbar0").hide();
}

function get_activity_tcx(_activity_id) {
  var garmin_activity_tcx_url = 'https://connect.garmin.com/modern/proxy/activity-service-1.1/tcx/activity/activity_id?full=true';
  chrome.downloads.download({
    url: garmin_activity_tcx_url.replace('activity_id', _activity_id),
    filename: 'nfndz_garmin_logs/'+_activity_id+'.tcx',
    conflictAction: 'overwrite'
  });
  // $.get(garmin_activity_tcx_url.replace('activity_id', _activity_id), 
  //   { full: true })
  //   .done(function(data) {

  //   })
  //   .fail(function() {
      
  //   })
  //   .always(function() {
      
  // });
}

function download_activities() {
  if (g_cur_downloading_activity_id < g_all_activity_ids.length) {
    get_activity_tcx(g_all_activity_ids[g_cur_downloading_activity_id]);
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
    if (g_all_activity_ids.indexOf(obj.id) == -1) {
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
      $("#pbar0 > p").text('Getting Activities of '+year+'/'+(month+1));
      store_activity_ids(data, mode, date1, date2);
      g_cur_date.add(1, 'months');
      if (g_cur_date.isSame(g_end_date, 'month')) {
        get_all_activities_of_the_month(g_cur_date.year(), g_cur_date.month(), 2, g_end_date);
      } else if (g_cur_date.isBefore(g_end_date, 'month') ) {
        get_all_activities_of_the_month(g_cur_date.year(), g_cur_date.month(), 0, g_cur_date);
      } else {
        // We are done!
        $('#total_activities_show')
          .html('<strong>'+g_all_activity_ids.length+'</strong> activities were found.')
          .show();
        $("#pbar0 > p").text('Downloading and Synchronizing the Activities...');
        //download_activities();
      }
    })
    .fail(function() {
      toastr.error('Cannot get activities from Garmin. Please log in to Garmin Connect first.');
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
    $(this).prepend('<i class="fa fa-circle-o-notch fa-spin fa-fw"></i>');
    $(this).prop("disabled", true);

    var start_date = $("#start_date").val();
    var end_date = $("#end_date").val();
    
    $("#pbar0").show();
    get_all_garmin_activities_id(start_date, end_date);
  });
}

function enable_sync_btn() {
  $('#sync_btn').find("i").remove();
  $('#sync_btn').prop("disabled", false);  
}

function register_test_btn() {
  $('#test_btn').on('click', function (e) {
    e.preventDefault();
    var data = new FormData();
    jQuery.each(jQuery('#fn')[0].files, function(i, file) {
        data.append('file-'+i, file);
    });
    console.log(data);
  });
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

  $('#pbar').hide();

  register_action_btn();
  //register_test_btn();
  register_datepicker_events();
  register_form_validator();
});
