'use strict'

import { Worker } from 'worker_threads'

class Machine {

	ingredients = [
		{ ingredient: 'milk', amount: 0 },
		{ ingredient: 'cacao', amount: 0 }
		// { ingredient: something, amount: 0 },
		// etc...
	]

	buckets = []

	proportions = {
		milk: 0.8,
		cacao: 0.2
		// something: 0.3,
		// etc...
	}

	machineSlotsNumber = 2

	outlets = []
	// Status represents not only outlet's status, but also priority level
	// Where everything: < 0 -> errors, 0 -> idle/inactive, > 0 -> priority level(lower = higher priority)
	// Error codes: -1 -> bussy(e.g. self repairing/cleaning), -2 -> broken(e.g. throws errors), -3 -> unknow(no connection between machine and outlet)

	//ingredientsQueue = [] // e.g. outletId: {milk: 10, cacao: 25}

	//logs = []
	// If outlet dies, logs can be used to get bucet's state, so it can be processed by another outlet or the same one after repairing process

	//errorLog = []
	// If the same error came from the same outlet, outlet will get the broken status ('priority' = -2)
	// If all outlets threw error, the machine will be stopped

	//outletsLivelinessCheckQueue = []

	constructor(machineSlotsNumber, outlets) {
		if(machineSlotsNumber && typeof machineSlotsNumber === 'number') this.machineSlotsNumber = machineSlotsNumber
		if(outlets && Array.isArray(outlets)) {
			/*this.outlets = []
			const outletsLeng = outlets.length
			let i = 0
			while(i < outletsLeng) {
				Object.entries(outlets[i]).forEach(([key, value]) => {
					if(key === 'status'){
						if(typeof value !== 'number') i++
					}
					else if(key === 'process'){
						if(typeof value !== 'function' || value === null) i++
					}
					else i++
				})
				this.outlets.push(outlets[i])
				i++
			}*/
			const validOutlets = outlets.filter((val) => {
				return (typeof val.status === 'number' && val.process === null) //TODO: something with this shit
			})
			this.outlets = validOutlets
		}
		if(this.outlets.length === 0) {
			//this.outlets = [{status: 0, process: null},{status: -1, process: null}]
			//this.outlets = [{status: 0, process: null},{status: 0, process: null},{status: 0, process: null}]
			let outlets = []
			let i = 0;
			const rndOutletsNum = Math.round(Math.random() * 3 + 3)
			while(i < rndOutletsNum) {
				outlets.push({
					status: (Math.random() * 100 > 10) ? 0 : ((Math.random() * 100 > 70) ? Math.round(0 - Math.random() * 3) : Math.round(0 + Math.random() * 3)),
					process: null
				})
				console.log(outlets[i])
				i++
			}
			this.outlets = outlets
		}
		/*const outlets = this.getAllOutlets()
		if(outlets.length === 0) throw new Error("There is no outlets in the machine")
		this.outlets = outlets*/
	}

	addMilk(amount) {
		// maybe use 'Something went wrong with a milk pipe' ?
		if(typeof amount !== 'number') throw new Error("'amount' must be a number, not a " + typeof amount)
		this.milk += amount
	}

	addCacao(amount) {
		if(typeof amount !== 'number') throw new Error("'amount' must be a number, not a " + typeof amount)
		this.cacao += amount
	}

	async load(buckets, onBucketReady, slotsNumber) {
		if(!Array.isArray(buckets)) throw new Error("'buckets' must be an array, not a " + typeof buckets)
		if(typeof onBucketReady !== 'function') throw new Error("'onBucketReady' must be a function, not a " + typeof onBucketReady)
		if(!slotsNumber || typeof slotsNumber !== 'number' || slotsNumber > this.machineSlotsNumber) slotsNumber = this.machineSlotsNumber

		/*let i = 0
		const bucketsLeng = buckets.length
		while(i < bucketsLeng) {
			Object.entries(buckets[i]).forEach(([key, value]) => {
				if((key !== 'capacity' || key !== 'milk' || key !== 'cacao') || typeof value !== 'number') i++
			})
			this.buckets.push(buckets[i])
			i++
		}*/
		const validBuckets = buckets.map((bucket) => {
			//const validBucket = Object.entries(bucket).map(([key, value]) => { return bucket[key] = Number(value) })
			Object.entries(bucket).forEach(([key, value]) => {
				const newValue = Number(value)
				bucket[key] = (newValue) ? newValue : 0
			})
			//console.log(bucket)
			return bucket
		})
		/*console.log(validBuckets)
		return*/
		if(validBuckets.length !== 0) this.buckets = validBuckets

		let promiseArray = []
		const range = (slotsNumber <= this.outlets.length) ? slotsNumber : this.outlets.length
		let i = 0
		while(i < range) {
			promiseArray.push(this.setUpNewOutlet())
			i++
		}

		const outletsLivelinessCheck = setInterval(() => {
			const runningOutletsId = Object.keys(this.outlets).filter((key) => { return this.outlets[key].status > 0 })
			if(runningOutletsId.length === 0) return clearInterval(outletsLivelinessCheck)
			//this.outletsLivenessCheckQueue.concat(runningOutlets)
			/*if(this.outletsLivelinessCheck.length !== 0) {
				i = 0
				while(i < this.outletsLivelinessCheck.length) {

					i++
				}
			}*/
			//console.log(runningOutletsId)
			let outlet
			const roLeng = runningOutletsId.length
			i = 0
			while(i < roLeng) {
				/*this.outletsLivelinessCheckQueue.push({
					outletId: runningOutlets[j],
					status: 0
				})*/
				outlet = this.outlets[runningOutletsId[i]]
				//console.log(runningOutletsId[i])
				//console.log(this.outlets)
				if(!outlet.process || outlet.liveliness === -2) {
					//console.log('yes')
					this.outlets[runningOutletsId[i]].status = -3
					i++
					continue
				}
				this.outlets[runningOutletsId[i]].liveliness = (outlet.liveliness !== undefined) ? outlet.liveliness - 1 : 0
				try {
					console.log('here goes ping')
					//console.log(this.outlets[runningOutletsId[i]])
					this.outlets[runningOutletsId[i]].process.postMessage({header: 'ping'})
				}
				catch(err) {
					console.log(err)
					this.outlets[runningOutletsId[i]].status = -3
				 }
				i++
			}
		}, 2000)

		return Promise.all(promiseArray)
	}

	setUpNewOutlet(outletId) {
		return new Promise(async (resolve, reject) => {
			if(outletId === undefined || typeof outletId !== 'number') outletId = this.outlets.findIndex((outlet) => outlet.status === 0)
			if(outletId === -1) {
				console.log(this.outlets)
				if(this.outlets.find((val) => { return val.status > -2 }) === undefined) {
					console.log('rejecting')
					return reject("There are no outlets available")
				}
				else if(this.outlets.find((val) => { return val.status === -1 }) === undefined){
					return resolve()
				}
				else{
					outletId = await this.waitForAvailableOutlet()
					if(outletId === undefined) { // TODO: remember '!0 = true' :)
						console.log('rejecting2')
						return reject("There are no outlets available")
					}
				}
			}
			this.outlets[outletId].status = -1 // changing outlet's status to -1 as soon as possible to avoid conflicts // TODO: make it elsehow
			console.log('setUpNewOutlet '+outletId)
			this.outlets[outletId].process = new Worker('./outlet.mjs', { workerData: this.proportions })
			this.outlets[outletId].status = this.getNewPriorityLevel() // TODO: maybe make functions ONLY for outlets, because there are can be other "mechanisms"
			this.outlets[outletId].process.on('message', (message) => {
				console.log('message '+message.header)
				switch(message.header) {
					case 'requestIngredients':
						//const ingredient = (message.header === 'requestMilk') ? 'milk' : 'cacao'
						//const responseBody = []
						let i = 0
						const ingredientsLeng = message.body.length
						while(i < ingredientsLeng) {
							Object.entries(message.body[i]).forEach(([ingredient, amount]) => {
								this.requestIngredient(ingredient, amount).then((recivedAmount) => {
									if(recivedAmount > 0) {
										let respIngredient = {}
										respIngredient[ingredient] = recivedAmount
										this.outlets[outletId].process.postMessage({header: 'addIngredients', body: respIngredient})
									}
									else {
										if(!this.outlets[outletId].queue) this.outlets[outletId].queue = []
										//this.outlets[outletId].queue.push({ingredient: message.body.ingredient, amount: message.body.amount})
										this.outlets[outletId].queue[ingredient] = amount
										console.log(this.outlets[outletId].queue)
									}
									//else this.ingredientsQueue.push({outlet: this.outlets[outletId], ingredient: ingredient, amount: amount})
									//else this.ingredientsQueue.push({outlet: this.outlets[outletId], ingredient: ingredient, amount: message.body})
								}).catch((err) => {console.log(err)})
							})
						i++
						}
						/*let i = 0
						const ingredientsLeng = message.body.length
						while(i < ingredientsLeng) {
							this.requestIngredient(message.body.ingredient, message.body.amount).then((recivedAmount) => {
								//console.log('HERE')
								if(recivedAmount > 0) {
									//let respIngredient = {}
									//respIngredient[ingredient] = recivedAmount
									//this.outlets[outletId].process.postMessage({header: 'addIngredients', body: respIngredient})
									this.outlets[outletId].process.postMessage({header: 'addIngredients', body: [{ingredient: message.body.ingredient, amount: recivedAmount}]})
								}
								else {
									//console.log('HERE')
									if(!this.outlets[outletId].queue) this.outlets[outletId].queue = []
									this.outlets[outletId].queue.push({ingredient: message.body.ingredient, amount: message.body.amount})
									//console.log(this.outlets[outletId].queue)
								}
								//else this.ingredientsQueue.push({outlet: this.outlets[outletId], ingredient: ingredient, amount: amount})
								//else this.ingredientsQueue.push({outlet: this.outlets[outletId], ingredient: ingredient, amount: message.body})
							}).catch((err) => {console.log(err)})
							i++
						}*/
						//if(responseBody.length !== 0) this.outlets[outletId].process.postMessage({header: 'addIngredients', body: responseBody})
						break
					case 'requestBucket':
						this.outlets[outletId].process.postMessage({header: 'insertBucket', body: this.buckets.shift()})
						break
					case 'returnBucket':
						const bucket = message.body
						switch(message.reason) {
							case 'done':
								onBucketReady()
								if(this.buckets.length === 0) {
									this.outlets[outletId].process.terminate()
									this.outlets[outletId].process = null
									this.outlets[outletId].status = 0
									return resolve()
									//if(this.getRunningOutlets().length === 0) resolve()
								}
								this.outlets[outletId].process.postMessage({header: 'insertBucket', body: this.buckets.shift()})
								break
							case 'error':
								this.buckets.unshift(bucket)
								this.outlets[outletId].status = -1
								return reject('changeOutlet')
								break
							case 'critical error':
								this.buckets.unshift(bucket)
								this.outlets[outletId].process.terminate()
								this.outlets[outletId].process = null
								this.outlets[outletId].status = -2
								return reject('changeOutlet')
								break
						}
						break
					case 'pong':
						this.outlets[outletId].liveliness = 1
						break
					default:
						console.log(`Unknown message | machine | ${message.header}`)
						break
				}
				/*if(message.header === 'requestMilk' || message.header === 'requestCacao') {
					const ingredient = (message.header === 'requestMilk') ? 'milk' : 'cacao'
					requestIngredients(ingredient, message.body).then((amount) => {
						if(amount > 0) this.outlets[outletId].process.postMessage({header: 'add'+ingredient, body: amount})
						else this.ingredientQueue.push({outlet: this.outlets[outletId], ingredient: ingredient, amount: message.body})
					}).catch((err) => {
						console.log(err)
						//console.log('Will try to return the bucket and repair the outlet')
						//this.outlets[outletId].process.postMessage({header: 'returnBucket'})
						//this.outlets[outletId].process.terminate()
						//this.outlets[outletId].process = new Worker('./outlet.js')
					})
				}
				else if(message.header === 'pong') {
					this.outlets[outletId].liveliness = 1
				}
				else if(message.header === 'requestBucket') {
					this.outlets[outletId].process.postMessage({header: 'insertBucket', body: this.buckets.shift()})
				}*/
				/*else if(message.header === 'returnBucket') {
					if(message.reason === 'done') {
						let bucket = message.body
						onBucketReady()
						if(this.buckets.length === 0) {
							this.outlets[outletId].process.terminate()
							this.outlets[outletId].process = null
							this.outlets[outletId].status = 0
							if(this.getRunningOutlets().length === 0) resolve()
						}
						this.outlets[outletId].process.postMessage({header: 'insertBucket', body: this.buckets.shift()})
					}
					else{
						console.log('bruh')
					}
				}*/
			})
			this.outlets[outletId].process.on('error', (err) => {
				console.log(`${err} | outletId: ${outletId}`)
				this.outlets[outletId].process = null
				this.outlets[outletId].status = -1
				this.repairOutlet(outletId).then((val) => {
					if(val === 'successful') {
						this.outlets[outletId].status = 0
						console.log(`Outlet was successfully repaired | outletId: ${outletId}`)
					}
				}).catch((err) => {
					this.outlets[outletId].status = -2
					console.log(err)
				})
				//return this.setUpNewOutlet()
				return reject('changeOutlet')
			})
		}).catch((err) => {
			if(err === 'changeOutlet') {
				//console.log('reRun')
				return this.setUpNewOutlet()
				//reject('reRun')
			}
			else return Promise.reject('bfsdfs')
		})
	}

	async requestIngredient(ingredient, reqAmount) {
		return new Promise((resolve, reject) => {
			//console.log('HERE')
			//this.ingredients.map((val) => { return val.ingredient === ingredient })
			const ingredientContainersId = Object.keys(this.ingredients).filter((key) => { return this.ingredients[key].ingredient === ingredient })
			if(ingredientContainersId.length === 0) reject(`There is no '${ingredient}' ingredient`)
			let i = 0
			const ingredientContainersIdLeng = ingredientContainersId.length
			let amount
			let collectedAmount = 0
			while(i < ingredientContainersIdLeng) {
				amount = this.ingredients[ingredientContainersId[i]].amount
				if(amount > 0) {
					if(amount > reqAmount) {
						this.ingredients[ingredientContainersId[i]].amount -= reqAmount
						collectedAmount += reqAmount
						//resolve(reqAmount)
					}
					else {
						this.ingredients[ingredientContainersId[i]].amount = 0
						//resolve(amount)
						collectedAmount += amount
					}
				}
				i++
			}
			resolve(collectedAmount)
			/*if(this.ingredients[ingredient] === undefined) reject(`There is no '${ingredient}' ingredient`)
			const amount = this.ingredients[ingredient]
			if(amount > 0) {
				if(amount > reqAmount) {
					this.ingredients[ingredient] -= reqAmount
					resolve(reqAmount)
				}
				else {
					this.ingredients[ingredient] = 0
					resolve(amount)
				}
			}
			else{
				resolve()
			}*/
		})
	}

	getNewPriorityLevel() {
		const lastPriorityLevel = Math.max.apply(Math, this.outlets.map((val) => { return  val.status }))
		return (lastPriorityLevel > 0) ? lastPriorityLevel + 1 : 1
	}

	/*getRunningOutlets() {
		return this.outlets.filter((val) => { return val.status > 0 })
	}*/

	async repairOutlet(outletId) {
		/*const bug = setTimeout(() => {
			console.log('after');
			clearTimeout(bug)
		}, 500);*/
		return new Promise(async (resolve, reject) => {
			if(Math.random() * 100 > 50){ // Impossible to repair simulation
				//this.outlets[outletId].status = -2
				//console.log(`Attempt to repair outlet failed | outletId: ${outletId}`)
				return reject(`Impossible to repair outlet | outletId: ${outletId}`)
			}//throw new Error(`Impossible to repair outlet | outletId: ${outletId}`)
			//this.outlets[outletId].process.terminate()
			//this.outlets[outletId].process = new Worker('./outlet.mjs')
			//this.outlets[outletId].status = 0
			//console.log(`Outlet was repaired | outletId: ${outletId}`)
			return resolve('successful')
		})
		/*if(Math.random() * 100 > 50){ // Impossible to repair simulation
			//this.outlets[outletId].status = -2
			//console.log(`Attempt to repair outlet failed | outletId: ${outletId}`)
			throw new Error(`Impossible to repair outlet | outletId: ${outletId}`)
		}//throw new Error(`Impossible to repair outlet | outletId: ${outletId}`)
		//this.outlets[outletId].process.terminate()
		//this.outlets[outletId].process = new Worker('./outlet.mjs')
		//this.outlets[outletId].status = 0
		//console.log(`Outlet was repaired | outletId: ${outletId}`)
		return 'successful'*/
	}

	waitForAvailableOutlet(timeOut) {
		return new Promise((resolve) => {
			const interval = 2000
			const i = 0
			if(!timeOut || typeof timeOut === 'number') timeOut = 10000
			const wfaoInterval = setInterval(() => {
				//console.log('interval activated')
				if(timeOut <= 0){
					clearInterval(wfaoInterval)
					return resolve()
				}
				const outletId = this.outlets.findIndex((outlet) => outlet.status === 0)
				if(outletId !== -1) {
					//console.log('interval found available outlet ' + outletId)
					//this.outlets[outletId].status = -1 // changing outlet's status to -1 as soon as possible to avoid conflicts // TODO: make it elsehow
					clearInterval(wfaoInterval)
					return resolve(outletId)
				}
				if(this.outlets.filter((outlet) => outlet.status < -1).length === this.outlets.length) {
					//console.log("interval didn't find any 'busy' outlet")
					clearInterval(wfaoInterval)
					return resolve()
				}
				timeOut -= interval
			}, 2000)
		})
	}

	/*async getAvailableOutlet() {
		outletId = this.outlets.findIndex((outlet) => outlet.status === 0)
		if(outletId === -1) {
			console.log(this.outlets)
			if(this.outlets.find((val) => { return val.status > -2 }) === undefined) {
				console.log('rejecting')
				return reject("There are no outlets available")
				//throw new Error("There are no outlets available")
				//return Promise.reject("There are no outlets available")
			}
			else if(this.outlets.find((val) => { return val.status === -1 }) === undefined){

				//return resolve()
				//return
				//return Promise.resolve()
			}
			else{
				console.log('newId')
				outletId = await this.waitForAvailableOutlet()
				if(outletId === undefined) { // TODO: remember '!0 = true' :)
					console.log('rejecting2')
					return
					//return reject("There are no outlets available")
				}
			}
		}
	}*/

	/*getAllOutlets() { // Getting information about internal outlets simulation
		let outlets = []
		let i = 0;
		while(i < Math.round(Math.random() * 4 + 2)) {
			outlets.push({
				status: (Math.random() * 100 > 70) ? 0 : Math.round(0 - Math.random() * 3),
				process: null
			})
			i++
		}
		// Status represents not only outlet's status, but also priority level
		// Where everything: < 0 -> errors, 0 -> idle/inactive, > 0 -> priority level(lower = higher priority)
		// Error codes: -1 -> bussy(e.g. self repairing/cleaning), -2 -> broken(e.g. throws errors), -3 -> unknow(no connection between machine and outlet)
		return outlets
	}*/
}


(async () => {
	// JSON parse is faster than JS literal - https://www.youtube.com/watch?v=ff4fgQxPaO0
	const buckets = JSON.parse(
		"[{\"capacity\":\"10\",\"milk\":\"0\",\"cacao\":\"0\"},{\"capacity\":\"1000\",\"milk\":\"0\",\"cacao\":\"0\"},{\"capacity\":\"500\",\"milk\":\"0\",\"cacao\":\"0\"},{\"capacity\":\"4000\",\"milk\":\"0\",\"cacao\":\"0\"},{\"capacity\":\"200\",\"milk\":\"0\",\"cacao\":\"0\"},{\"capacity\":\"1000\",\"milk\":\"0\",\"cacao\":\"0\"},{\"capacity\":\"300\",\"milk\":\"0\",\"cacao\":\"0\"},{\"capacity\":\"0\",\"milk\":\"0\",\"cacao\":\"0\"}]"
	);

	const machine = new Machine()

	const job = setInterval(() => {
		machine.addMilk(Math.random() * 100)
		machine.addCacao(Math.random() * 100)
	}, Math.random() * 100)

	const onBucketReady = (bucket) => {
		console.log('Bucket has been filled, capacity: ', bucket.capacity, 'milk', bucket.milk, 'cacao', bucket.cacao)
	}

	// better solution
	machine.load(buckets, onBucketReady).then(() => {
		console.log('Finished filling all the buckets')
	}).catch((error) => {
		console.log(error)
	}).finally(() => {
		console.log('ALL DONE!!!!!!!!')
		clearInterval(job)
	})

	/*clearInterval(job)

	console.log('Finished filling all the buckets')*/
})()

/*(async () => {
	const buckets = [{
		capacity: 10,
		milk: 0,
		cacao: 0
	}, {
		capacity: 1000,
		milk: 0,
		cacao: 0
	}, {
		capacity: 500,
		milk: 0,
		cacao: 0
	}, {
		capacity: 4000,
		milk: 0,
		cacao: 0
	}, {
		capacity: 200,
		milk: 0,
		cacao: 0
	}, {
		capacity: 1000,
		milk: 0,
		cacao: 0
	}, {
		capacity: 300,
		milk: 0,
		cacao: 0
	}, {
		capacity: 0,
		milk: 0,
		cacao: 0
	}]

	const machine = new Machine()

	const job = setInterval(() => {
		machine.addMilk(Math.random() * 100)
		machine.addCacao(Math.random() * 100)
	}, Math.random() * 100)

	const onBucketReady = (bucket) => {
		console.log('Bucket has been filled, capacity: ', bucket.capacity, 'milk', bucket.milk, 'cacao', bucket.cacao)
	}

	await machine.load(buckets, onBucketReady)

	clearInterval(job)

	console.log('Finished filling all the buckets')
})()*/