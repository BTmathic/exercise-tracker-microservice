# Exercise Tracker REST API

#### A microservice project, part of Free Code Camp's curriculum

An exercise tracker API that allows for new users to be created and exercises to be added for any such user. Once a user is created they get a userId, and then their exercise logs can be checked with

`https://basalt-watcher.glitch.me/api/exercise/log?{userId}[&from][&to][&limit]`

where the userId is required, and the from, to and limit parameters are optional. From and to in (yyyy-mm-dd) format and limit a positive integer.
