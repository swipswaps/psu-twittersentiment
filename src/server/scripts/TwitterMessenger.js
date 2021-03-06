import twitter from 'twitter' // Client for talking to the Twitter API
import _ from 'lodash'

// Exposes methods for creating and sending queries to the Twitter API
export default class TwitterMessenger {
	constructor () {
		// Load credentials for accessing Twitter API and initialize a client
		// Credentials can be loaded from the project .env file
		this.client = new twitter({
			consumer_key: process.env.TWITTER_CONSUMER_KEY,
			consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
			access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
			access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET			
		})

	}

	
	/**
	* Use an array of search parameter configurations to query the Twitter API
	* @param {Object} parameterSet - List of parameter configurations. See TwitterMessenger.search() 
	* @return An array of formatted JSON objects representing Tweets which match the searches 
	*/
	async searchSet (parameterSet) {
		let results = await parameterSet.map(async params => {
			return await this.search(params)
		})

		// When all the searches complete, resolve the aggregated results
		return await Promise.all(results)
			.then(async responseList => {
				let aggregatedResults = []

				// Extract results from each returned list into aggregated list
				responseList.forEach(statusList => {
					statusList.forEach(status => {
						aggregatedResults.push(status)
					})
				})

				return aggregatedResults
			})
			.catch(reason => {
				console.log('Could not successfully search Twitter API with query set')
				console.log(reason)
			})
	}

	/**
	* Gets tweets using the specified parameters.
	*
	* @param search The text to use as the search query
	* @param count The number of tweets to retrieve
	* @returns The retrieved tweets
	*/
	async getTweets(searches, count) {

		let statuses = []

		if (!Array.isArray(searches)) {
			searches = [searches]
		}

		for (let search of searches) {
			let params = {
				q: search + " Exclude:retweets",
				count: count,
				lang: 'en',
				since_id: 0
			}

			while (params.count > 0) {
				let results = await this.client.get('search/tweets', params)
				params.count -= results.search_metadata.count
				params.since_id = _.minBy(results.statuses, 'id').id
				statuses = _.concat(statuses, results.statuses)
			}
		}

		return statuses
	}

	/**
	* Hit the Twitter search API with the given parameters
	* For params: https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets.html#parameters
	* Each parameter component is a property of a 'params' JSON object
	* @param {Object} params - Composed of properties matching the 'search/tweets' API
	* @return A formatted list of tweets that match the search configuration
	* TODO add a 'count' parameter for adjustment based on search priority / importance
	*/
	async search (params) {
		// Search with given parameter configuration
		let results = await this.client.get('search/tweets', params)
		return formatTweets(results.statuses)
	}	
}
