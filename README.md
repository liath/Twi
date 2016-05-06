Twi is a danbooru clone written on Node.js/Express and Bootstrap
----------------------------------------------------------------
[ ![Codeship Status for Liath/Twi](https://codeship.com/projects/d6af8d80-4fec-0133-ab42-6a4e3a7a7098/status?branch=master)](https://codeship.com/projects/107457)

Basic functionality is present but I would at best put the project at an early beta status. (Now working on Heroku Cedar-14!)

The comments, notes, artists, and tags sections haven't been touched but the stuff that involves them in the other tabs is essentially done, they just need routes and templates.

### Usage
```
git clone https://github.com/Liath/Twi.git twi
cd twi
nano settings.js # Configure to your needs
# If you're running with local storage:
npm start
# If you're using something like heroku, you'll need to get the settings into the
# TWI_SETTINGS environment variable. Here's a complete Heroku setup.
heroku create
heroku config:set TWI_SETTINGS=`node -e "console.log(JSON.stringify(require('./settings.js')));"`
heroku git:remote
git push heroku
```

### Features Implemented:
- Transparent Imgur storage

### Planned:
- Similar transparent support for AWS
- File hashing to prevent duplicate posts (Is only available on direct storage mode currently.)
- A setup script
- Admin functionality (It's currently nonexistant)

Unless noted otherwise, all of my code in this project shall be licensed as follows:

Copyright 2016 John Jones <Liath@github>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.