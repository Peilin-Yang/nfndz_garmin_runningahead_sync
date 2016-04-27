var server = 'http://infolab.ece.udel.edu:8008/crawl_handler/';
var get_query_route = 'articles_tobe_crawled.json';
var request_interval = 30; // 30 minutes
var request_timer_id;
var default_crawl_interval = 1.5 * 1000; // 3 seconds
var crawl_interval = 1.5 * 1000; // 3 seconds
var crawl_retry_cnt = 0;
var max_crawl_retry_cnt = 1;
var crawl_timer_id;

var post_url = 'post_news_articles';
var post_fail_wait = 10*1000; // 10 seconds
var post_timer_id;
var total_queries_cnt;
var cur_query_idx;
var cur_q;

var query_json = [];

function cancel_crawler() {
  clearTimeout(request_timer_id);
  clearTimeout(crawl_timer_id);
  $('div#get_query_cd').countdown('stop');
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

/*****
* The CALLBACK function after getting all the activities of the month.
* mode: 0 - store all activities;
* mode: 1 - ignore the date before (for the starting month)
* mode: 2 - ignore the date after (for the ending month)
******/
function store_activities(all_activities_in_month, mode, date) {

}

function get_all_activities_of_the_month(year, month) {
  var garmin_month_activities_list_url = 'https://connect.garmin.com/proxy/calendar-service/year/year_input/month/month_input';
  $.getJSON(garmin_month_activities_list_url.replace('year_input', start_year).replace('month_input', start_month), 
    { _: new Date().getTime() })
    .done(function(data) {
      get_activity_tcx('1105963703');
    })
    .fail(function() {
      
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
  var _start = moment(start_date);
  var _end = moment(end_date);
  var start_year = _start.year();
  var start_month = _start.month();
  var end_year = _end.year();
  var end_month = _end.month();

  var tmp_start = moment(start_date);
  var this_month = tmp_start.add(1, 'months');
  
}

function register_action_btn() {
  $('#sync_btn').on('click', function (e) {
    e.preventDefault();
    $(this).prepend('<i class="fa fa-circle-o-notch fa-spin fa-fw"></i>');
    $(this).prop("disabled", true);

    var start_date = $("#start_date").val();
    var end_date = $("#end_date").val();
    
    get_all_garmin_activities_id(start_date, end_date);
    // $('#submit_model').find("i").remove();
    // $('#submit_model').prop("disabled", false);
  });
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

$( document ).ready(function() {
  $('.input-daterange input').each(function() {
    $(this).datepicker({
      autoclose: true,
    });
  });
  $('#pbar').hide();
  register_action_btn();
  //register_test_btn();
});
