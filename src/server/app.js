'use strict'
require('babel-core').transform('code')
import "babel-polyfill"
import _ from 'lodash'

// Load variables from '.env' in the project root
import dotenv from 'dotenv'
dotenv.config({silent: true})

import express from 'express' // Lightweight framework for handling requests, routing
import path from 'path' // Resolves relative pathing issues
import bodyParser from 'body-parser' // Utility for parsing request bodies

import Controller from './scripts/Controller'
import TwitterMessenger from "./scripts/TwitterMessenger";
import WatsonMessenger from "./scripts/WatsonMessenger"; // The main application controller

import { preprocessTweets, removeLinks } from "./scripts/Parsing"


// Instantiate the application controller
// NOTE test / developmental methods are called in submodule constructors from the
// 		creation of this object
let controller = new Controller()

let twitter = new TwitterMessenger()
let watson = new WatsonMessenger()

// Define the express app
const app = express()

// Look at this directory for '/' paths e.g. localhost:8080/index.html
app.use(express.static(path.join(__dirname, '../client/static')))
// Look at this directory for '/css' paths
app.use('/css', express.static(path.join(__dirname, '../client/static')))
// Look at this directory for '/js' paths
app.use('/js', express.static(path.join(__dirname, '../client/js')))

app.use(bodyParser.json()) // Parse request payloads as JSON

app.get('/api/sentiment', (req, res) => {
	twitter.getTweets(['PSU', 'Penn State', 'Penn State University'], 200).then((tweets) => {

		let origTweets = _.map(tweets, 'text')

		origTweets = _.uniq(origTweets)

		let procTweets = preprocessTweets(origTweets)

		let tweetText = procTweets.join('\n')

		watson.nluAnalyzeText(tweetText).then((ret) => {

			function transform(data) {
				return {
					text: data.text,
					sentiment: data.sentiment.score,
					sadness: data.emotion.sadness,
					joy: data.emotion.joy,
					fear: data.emotion.fear,
					disgust: data.emotion.disgust,
					anger: data.emotion.anger
				}
			}

			let keywords = _.filter(ret.keywords, (o) => {
				return o.emotion && o.relevance >= 0.5
			})

			let entities = _.filter(ret.entities, (o) => {
				return o.emotion && o.relevance >= 0.5
			})

			keywords = _.map(keywords, transform)
			entities = _.map(entities, transform)

			let result = _.concat(keywords, entities)
			// origTweets = origTweets.map(tweet => { return removeLinks(tweet).join(' ') })

			let sentimentPayload = {
				tweets: origTweets,
				keywords: result
			}

			res.send(JSON.stringify(sentimentPayload))
		})
	})
})

let port = process.env.PORT || process.env.VCAP_APP_PORT || 8080

// Don't listen automatically if we're testing
if (process.env.NODE_ENV !== 'test') {
	// Listen on the given port
	app.server = app.listen(port, () => {
		console.log('app listening on port ' + port)
	})
}

export default app
