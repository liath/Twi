$(function(){
    'use strict';

    window.tags = {};

    $.getJSON("/s/tags", function(json) {
        window.tags = json;
    });

    function addTag(target, tag) {
        var t = JSON.parse(target.val());
        if (t.length == 0) t = [];
        else {
            var check = false;
            t.forEach(function(i){
                if(i.n==tag.n){check = true;}
            });
            if (check) return false;
        }
        if (typeof(tag.t) == 'undefined') t.push({'n': tag.n, 'p': tag.p});
        else t.push({'n': tag.n, 'p': tag.p, 't': 1});
        t = jQuery.unique(t);
        target.val(JSON.stringify(t));
        return true;
    }
    function addTagLabel(to, tag){
        var label = '';
        if (to.html().length == 0) {
            label = 'Tags: <span><a class="label';
        } else {
            label += '<span>, <a class="label';
        }
        if (typeof(tag.t) == 'undefined'){ // Only tags that haven't been created on the server should have a 't' property
            if (typeof(tag.m.t) != 'undefined') {
                label += ' label-'+tag.m.t;
            }
            label += '" href="/wiki/'+tag.n+'">'+tag.p+'</a><a data-tag="'+tag.n+'" class="tagdispel">&cross;</a></span>';
        } else {
            label += '">'+tag.p+'</a><a data-tag="'+tag.n+'" class="tagdispel">&cross;</a></span>';
        }
        to.append(label);
        //Update the hook
        $('.tagdispel').click(function() {
            if ($(this).parent().parent().html() == null) return; //Fix weird ghosted click bug
            var form = $(this).parent().parent().siblings('.upload-info-form');
            var t = JSON.parse(form.children('.file-tags').val());
            var nt = [];
            var that = $(this);
            t.forEach(function(i){
                if(i.n!=that.data('tag')){nt.push(i);}
            });
            form.children('.file-tags').val(JSON.stringify(nt));
            var p = $(this).parent().parent();
            $(this).parent().remove();
            if (p.html() == 'Tags: ') p.html('');
        });
    }
    function toTitleCase(str) { //http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    window.delayFix = function() {
        $('.delayed').each(function() {
            $(this).removeClass('delayed');
            $(this).attr('src', $(this).data().imageurl);
        });
        //Update the hooks on EVERYTHING
        $('.taglist').typeahead({
            source: window.tags,
            property: 'p',
            onselect: function(caller, data) {
                $('.taglist').val('');
                if (addTag($(caller.$element).siblings('.upload-info-form').children('.file-tags'), data)) {
                    addTagLabel($(caller.$element).siblings('.tags'),data);
                }
            }
        });
        $('.taglist').keydown(function(e) {
            if (e.keyCode == 13) {
                var tag = {
                    p: toTitleCase($(this).val()),
                    n: $(this).val().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    t: 1
                }
                $('.taglist').val('');
                if (addTag($(this).siblings('.upload-info-form').children('.file-tags'), tag)) {
                    addTagLabel($(this).siblings('.tags'),tag);
                }
                return false;
            }
        });
        $('.create-submit').click(function(){
            $(this).parent().siblings('.upload-info-form').submit();
            return false;
        });
        $('.upload-info-form').submit(function(e) {
            $(e.currentTarget).children('button').attr('disabled', 'disabled');
            $(e.currentTarget).parent().append('<div class="submit-overlay"></div>')
            $(e.currentTarget).parent().children('.submit-overlay').css({top:$(e.currentTarget).parent().parent().position().top, left: $(e.currentTarget).parent().parent().position().left, height: $(e.currentTarget).parent().parent().height(), width: $(e.currentTarget).parent().parent().width()});
            var overlay = $(e.currentTarget).parent().children('.submit-overlay');
            var form    = $(e.currentTarget);
            var postdata = {
                'tags' : JSON.parse($(e.currentTarget).children('.file-tags').val()),
                'source' : $(e.currentTarget).children('.file-source').val()
            };
            $.post($(e.currentTarget).attr('action'), postdata, function(data) {
                console.log('Data from server:');
                console.log(data);
                $(overlay).remove();
                var btn = '<button class="btn btn-warning right" onclick="$(this).parent().parent().remove()"><i class="icon-ban-circle icon-white"></i><span>Close</span></button>';
                if (data.error) {
                    if (data.error == "Image already exists.") {
                        $(form).parent().html('<span class="submitted-message">Image already exists, go here to view it: <a href="'+data.path+'">'+data.path+'</a></span>'+btn);
                    } else {
                        $(form).parent().html('<span class="submitted-message">Error'+data.error+'</span>'+btn);
                    }
                } else {
                    $(form).parent().html('<span class="submitted-message">Done! <a href="/post/'+data.a+'">Click here to go to the post.</a></span>'+btn);
                }
            }, 'json');
            e.preventDefault();
            return false;
        });
    };
    // Initialize the jQuery File Upload widget:
    $('#fileupload').fileupload();

    // Enable iframe cross-domain access via redirect option:
    $('#fileupload').fileupload(
        'option',
        'redirect',
        window.location.href.replace(
            /\/[^\/]*$/,
            '/cors/result.html?%s'
        )
    );

    // Load existing files:
    $('#fileupload').each(function () {
        var that = this;
        $.getJSON(this.action, function (result) {
            if (result && result.length) {
                $(that).fileupload('option', 'done')
                    .call(that, null, {result: result});
            }
        });
    });

    $('#fileupload').bind('fileuploadcompleted', function (e, data) {
        var t = setTimeout("delayFix()", 1000);
    });
    /*$('#fileupload').bind('fileuploadadded', function (e, data) {
        //console.log(data);
    });*/

});

// Fork of original bootstrap typeahead : https://gist.github.com/1866577

/* =============================================================
 * bootstrap-typeahead.js v2.0.0
 * http://twitter.github.com/bootstrap/javascript.html#typeahead
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */

!function( $ ){

    "use strict"

    var Typeahead = function ( element, options ) {
        this.$element = $(element)
        this.options = $.extend({}, $.fn.typeahead.defaults, options)
        this.matcher = this.options.matcher || this.matcher
        this.sorter = this.options.sorter || this.sorter
        this.highlighter = this.options.highlighter || this.highlighter
        this.$menu = $(this.options.menu).appendTo('body')
        this.source = this.options.source
        this.onselect = this.options.onselect
        this.strings = true
        this.shown = false
        this.listen()
    }

    Typeahead.prototype = {

        constructor: Typeahead

        , select: function () {
            var val = JSON.parse(this.$menu.find('.active').attr('data-value'))
                , text

            if (!this.strings) text = val[this.options.property]
            else text = val

            this.$element.val(text)

            if (typeof this.onselect == "function")
                this.onselect(this, val) // Liath - I modified this to pass 'this' so I can get 'this's siblings
                                         // You don't want to know what I did with 'this's siblings
                                         // But let's just say, they are no longer with us.
                                         // Do you like bannanas?

            return this.hide()
        }

        , show: function () {
            var pos = $.extend({}, this.$element.offset(), {
                height: this.$element[0].offsetHeight
            })

            this.$menu.css({
                top: pos.top + pos.height
                , left: pos.left
            })

            this.$menu.show()
            this.shown = true
            return this
        }

        , hide: function () {
            this.$menu.hide()
            this.shown = false
            return this
        }

        , lookup: function (event) {
            var that = this
                , items
                , q
                , value

            this.query = this.$element.val()

            if (typeof this.source == "function") {
                value = this.source(this, this.query)
                if (value) this.process(value)
            } else {
                this.process(this.source)
            }
        }

        , process: function (results) {
            var that = this
                , items
                , q

            if (results.length && typeof results[0] != "string")
                this.strings = false

            this.query = this.$element.val()

            if (!this.query) {
                return this.shown ? this.hide() : this
            }

            items = $.grep(results, function (item) {
                if (!that.strings)
                    item = item[that.options.property]
                if (that.matcher(item)) return item
            })

            items = this.sorter(items)

            if (!items.length) {
                return this.shown ? this.hide() : this
            }

            return this.render(items.slice(0, this.options.items)).show()
        }

        , matcher: function (item) {
            return ~item.toLowerCase().indexOf(this.query.toLowerCase())
        }

        , sorter: function (items) {
            var beginswith = []
                , caseSensitive = []
                , caseInsensitive = []
                , item
                , sortby

            while (item = items.shift()) {
                if (this.strings) sortby = item
                else sortby = item[this.options.property]

                if (!sortby.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item)
                else if (~sortby.indexOf(this.query)) caseSensitive.push(item)
                else caseInsensitive.push(item)
            }

            return beginswith.concat(caseSensitive, caseInsensitive)
        }

        , highlighter: function (item) {
            return item.replace(new RegExp('(' + this.query + ')', 'ig'), function ($1, match) {
                return '<strong>' + match + '</strong>'
            })
        }

        , render: function (items) {
            var that = this

            items = $(items).map(function (i, item) {
                i = $(that.options.item).attr('data-value', JSON.stringify(item))
                if (!that.strings)
                    item = item[that.options.property]
                i.find('a').html(that.highlighter(item))
                return i[0]
            })

            items.first().addClass('active')
            this.$menu.html(items)
            return this
        }

        , next: function (event) {
            var active = this.$menu.find('.active').removeClass('active')
                , next = active.next()

            if (!next.length) {
                next = $(this.$menu.find('li')[0])
            }

            next.addClass('active')
        }

        , prev: function (event) {
            var active = this.$menu.find('.active').removeClass('active')
                , prev = active.prev()

            if (!prev.length) {
                prev = this.$menu.find('li').last()
            }

            prev.addClass('active')
        }

        , listen: function () {
            this.$element
                .on('blur',     $.proxy(this.blur, this))
                .on('keypress', $.proxy(this.keypress, this))
                .on('keyup',    $.proxy(this.keyup, this))

            if ($.browser.webkit || $.browser.msie) {
                this.$element.on('keydown', $.proxy(this.keypress, this))
            }

            this.$menu
                .on('click', $.proxy(this.click, this))
                .on('mouseenter', 'li', $.proxy(this.mouseenter, this))
        }

        , keyup: function (e) {
            e.stopPropagation()
            e.preventDefault()

            switch(e.keyCode) {
                case 40: // down arrow
                case 38: // up arrow
                    break

                case 9: // tab
                case 13: // enter
                    if (!this.shown) return
                    this.select()
                    break

                case 27: // escape
                    this.hide()
                    break

                default:
                    this.lookup()
            }

        }

        , keypress: function (e) {
            e.stopPropagation()
            if (!this.shown) return

            switch(e.keyCode) {
                case 9: // tab
                case 13: // enter
                case 27: // escape
                    e.preventDefault()
                    break

                case 38: // up arrow
                    e.preventDefault()
                    this.prev()
                    break

                case 40: // down arrow
                    e.preventDefault()
                    this.next()
                    break
            }
        }

        , blur: function (e) {
            var that = this
            e.stopPropagation()
            e.preventDefault()
            setTimeout(function () { that.hide() }, 150)
        }

        , click: function (e) {
            e.stopPropagation()
            e.preventDefault()
            this.select()
        }

        , mouseenter: function (e) {
            this.$menu.find('.active').removeClass('active')
            $(e.currentTarget).addClass('active')
        }

    }


    /* TYPEAHEAD PLUGIN DEFINITION
     * =========================== */

    $.fn.typeahead = function ( option ) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('typeahead')
                , options = typeof option == 'object' && option
            if (!data) $this.data('typeahead', (data = new Typeahead(this, options)))
            if (typeof option == 'string') data[option]()
        })
    }

    $.fn.typeahead.defaults = {
        source: []
        , items: 8
        , menu: '<ul class="typeahead dropdown-menu"></ul>'
        , item: '<li><a href="#"></a></li>'
        , onselect: null
        , property: 'value'
    }

    $.fn.typeahead.Constructor = Typeahead


    /* TYPEAHEAD DATA-API
     * ================== */

    $(function () {
        $('body').on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
            var $this = $(this)
            if ($this.data('typeahead')) return
            e.preventDefault()
            $this.typeahead($this.data())
        })
    })

}( window.jQuery );