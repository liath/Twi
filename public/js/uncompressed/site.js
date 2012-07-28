$(function(){
    'use strict';

    $('html').removeClass('no-js');
    $('html').addClass('js');

    if(typeof($.browser.msie) != "undefined" && $.browser.msie){
        $("input").each(function(){
            if($(this).val()=="" && $(this).attr("placeholder")!=""){
                $(this).val($(this).attr("placeholder"));
                $(this).focus(function(){
                    if($(this).val()==$(this).attr("placeholder")) $(this).val("");
                });
                $(this).blur(function(){
                    if($(this).val()=="") $(this).val($(this).attr("placeholder"));
                });
            }
        });
    }
    $('.close').click(function() {
        $(this).parent().parent().remove()
    })
});