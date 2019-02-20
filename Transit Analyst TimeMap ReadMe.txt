This is a forntend project for development of a time map that gets data from a Navitia server (see https://github.com/shakedk/navitia-docker-compose) and uses HTML, JavaScript and Sass (scss) to display the results.

The project is using webpack server and NodeJS for easy development. It allows developing with a local dev server so the content is displayed in localhost:8080. For further details, read "README.md"

Install all needed dependencies: 
================================
1. Download and install Node.js (https://nodejs.org/en/download/)
2. Git clone this repository to a local folder (this project is part of TransitAnalystIsrael porject, so additional folders will be donwloaded)
   https://github.com/shakedk/TransitAnalystIsrael/tree/master/navitia-timemap
3. Open Git Bash terminal in the root folder and run "npm install"
4. Once done, run "npm run dev" 
5. Go to "localhost:8080"


How do I develop in this project?
=================================
Any changs performed on the below will be refelected in the browser, as long as the dev server is running ("npm run dev")
1. Main files are:
a. "index.ejs" which contains the HTML structure
b. "timeMap.js" which contains all the JS code needed for the map and controllers
c. "assests/styles/_custom.scss" for sytling in Sass

How do I deploy this project?
=============================
You can't use the dev server for deployment - it is unsafe!
As part of Transit Analyst Israel v1 (Mar 2019), we're using the navitia-timemap in static form
1. Open Git Bash terminal in the root folder and run "npm run build"
2. Once done, the static files are located in "../dist".
3. Open "../dist" and delet the ".map" files - they are redundant for deployment
4. Copy the entire "../dist" folder
