// jQuery Discord by Liath https://github.com/Liath
// MIT License until further notice
// The 'fleur' images (public/img/black.webp, public/img/white.webp) are copyright sixsixfive@deviantart and can be found here in a different form http://sixsixfive.deviantart.com/#/d4nv3ig
(function(d){var l,m,n,o,p,j,k,g,q,t,h,i;h=[];n=200;o=4;p=300;l="/img/white.webp";m="/img/black.webp";q=g=k=j=void 0;i={discord:function(a,c,b){b=Math.floor(Math.random()*b+1);setTimeout(function(){a.find("#cell-"+Math.floor(Math.random()*c)).toggleClass("discord-black")},b)},init:function(a){return this.each(function(){window.chaos||(d("head").append(t),window.chaos=!0);if(a&&(a.on&&(l=a.on),a.off&&(m=a.off),(a.on||a.off)&&d("head").append("<style type='text/css'>.discord-cell {background-image:url('"+l+"');}.discord-black {background-image:url('"+m+"');}</style>"),a.speed&&(n=a.speed),a.workers&&(o=a.workers),a.randomness))p=a.randomness;var c=d(this),b=c.data("discord");if(!b||!b.frame){j=c.width();k=c.height();g=j/50+1;q=k/50+1;var b=d('<div class="discord"></div>'),e=c.offset();b.css("width",j+"px");b.css("height",k+"px");b.css("left",e.left+"px");b.css("top",e.top+"px");for(var e=!0,r=0,f=0;f<q;f++){for(var u=d('<div class="discord-row" id="row-'+f+'"></div>'),s=e,v=0;v<g;v++)u.append('<div class="discord-cell'+(s?"":" discord-black")+'" id="cell-'+r+'"></div>'),s=!s,++r;b.append(u);e=!e}g=r;c.append(b);for(f=0;f<o;f++)h.push(setInterval(function(){i.discord(c,g,p)},n));c.resize(function(){c.discord("destroy");c.discord(a)});d(this).data("discord",{target:c,$frame:b})}})},destroy:function(){return this.each(function(){for(var a=0;a<h.length;a++)clearInterval(h[a]);h=[];a=d(this);a.data("discord").$frame.remove();a.removeData("discord")})}};t="<style type='text/css'>.discord {z-index:-1;overflow:hidden;position:absolute;}.discord-row {height:50px;white-space: nowrap;}.discord-cell {display:inline-block;height:50px;width:50px;background-image:url('/img/white.webp');}.discord-black {background-image:url('/img/black.webp');}</style>";d.fn.discord=function(a){if(i[a])return i[a].apply(this,Array.prototype.slice.call(arguments,1));if("object"===typeof a||!a)return i.init.apply(this,arguments);d.error("Method "+a+" does not exist on jQuery.discord")}})(jQuery);