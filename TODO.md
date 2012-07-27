#*Notes*:
* Use magic to make everything on image storage get cached by cloudflare so we aren't getting hits on the image server.
    * Browser -> Cloudflare -> Us (Either redirect or dns magic) -> Image server (Amazon/Imgur/etc)

* Some DB functions exists across pretty much every provider, we can prolly abstract those out and just pass the collection to common function

* We can def save page renders to redis. I wonder what their output even looks like...
    * http://stackoverflow.com/questions/9715636/node-js-page-caching
    * http://redis.io/commands/

* We can split the nav mixins to their respective subfolders and have the other mixins just use the main one and store their own in their base file. Not sure if performance would be effected either way so maybe not.

* In the event of tag corruption, rebuilding from the images collection isn't entirely sufficient, I suppose I could de-sluggify though.. hmm. replace - with ' ' and pretty case it.... Why didn't I just do that? Back when I... you what, it doesn't matter now.

* Make all uploads come to us directly before offloading them to storage so we can do an md5 check. Pretty sure I'll have to do that anyways to implement AWS support and I dislike having my imgur key out in the open.

* Consider lazy loading comments over ajax

#*Todo*:
* Make view count only increase on unique ip or something
    * This can be as simple as storing a cookie and only counting views from cookieless browsers
    * To as wildly complex as arrays of bloom filters tracking unique ip addresses for every image
    * Perhaps even use google analytics to track it for us and occasionally query them for the count...

* On the note of view counts, if we leave them as is we should prolly pool them then update them from cron so we aren't spawning a database call on every image load for something so trivial

* Finish the voting system on posts, prolly be some quick ajax

* Keep track of x number of recent wiki/tag changes
    * Needed to implement "Popular" search mode anyways

* When a user looks up an expensive item we can prolly store the item in redis(session) to save a second lookup if they post to that item

* Make descriptions for tags use markdown
    * We should prolly render out the markdown on submit to reduce load on page requests
    * Though, we'd then haveto output user input unescaped... :<
    * http://code.google.com/p/pagedown/wiki/PageDown

* Implement tag alias searching in tagProvider on lookups

* Implications and Aliases :<<<

* Find and cleanup lines marked with notes. ([!n])

* Add quick reply to comment listings

* Support for Favorites, Subscriptions, Popular (I guess order by view count?), random, and recent changes (hafta have like a queue we push when posts get edited)

* Pagination is disabled pretty much every where but it's implemented in the providers, just need to handle the get variable

* Move /post/ templates into their own subdirectory, who do they are taking the subview folder all to themselves anyways?

* Help pages. Help so far has been laid out in links as /help/topic. We should def make all these static pages though.

* Ability to revert wiki changes to previous messages

* When an alias is added that was also being used as a tag we should probably switch the tag over to the new parent tag