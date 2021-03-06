'use strict'

import { Worker } from 'worker_threads'

class Machine {

	containers = [
		{ ingredient: 'milk', amount: 0, capacity: 9999 }, // 'milk' is not going to be a key, because there are can be multiple 'milk' containers
		{ ingredient: 'cacao', amount: 0, capacity: 9999 },
		{ ingredient: 'waste', amount: 0, capacity: Infinity },
		// { ingredient: something, amount: 0, capacity: 9999 },
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

	outlets = [] // [{status: 0, process: null},{status: -1, process: null}]
	// Status represents not only outlet's status, but also priority level
	// Where everything: < 0 -> errors, 0 -> idle/inactive, > 0 -> priority level(lower = higher priority)
	// Error codes: -1 -> bussy(e.g. self repairing/cleaning), -2 -> broken(e.g. throws errors), -3 -> unknow(no connection between machine and outlet)
	// Some outlets will also  get:
	//		'bucketLogs' -> to know the bucket state (needed if outlet will die)
	//		'liveliness' -> to track the outlet's connection to the machine
	//		'queue' -> to send ingredients to the outlet later, when new ingredients arrived


	// TODO: this
	//errorLog = []
	// If the same error came from the same outlet, outlet will get the broken status ('priority' = -2)
	// If all outlets threw error, the machine will be stopped

	constructor(machineSlotsNumber, outlets) {
		if(!isNaN((machineSlotsNumber = Number(machineSlotsNumber)))) this.machineSlotsNumber = machineSlotsNumber
		if(Array.isArray(outlets)) {
			const validOutlets = outlets.filter((val) => {
				return (!isNaN((val.status = Number(val.status))) && val.process === null)
			})
			this.outlets = validOutlets
		}
		if(this.outlets.length === 0) { // Creation of random outlets if no outlets were given
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
	}

	addMilk(amount) {
		if(isNaN((amount = Number(amount)))) throw new Error(`'amount' must be a number | ${typeof amount} given | addMilk function`)
		this.addIngredient('milk', amount)
	}

	addCacao(amount) {
		if(isNaN((amount = Number(amount)))) throw new Error(`'amount' must be a number | ${typeof amount} given | addCacao function`)
		this.addIngredient('cacao', amount)
	}

	async addIngredient(ingredient, amount) {
		return new Promise((resolve, reject) => {
			if(typeof ingredient !== 'string') return reject(`'ingredient' must be a string | ${typeof ingredient} given | addIngredient function`)
			if(isNaN((amount = Number(amount)))) return reject(`'amount' must be a number | ${typeof amount} given | addIngredient function`)
			if(amount <= 0) return reject(`'amount' must be a positive number and not equal to 0 | ${amount} given | addIngredient function`)
			let ingredientContainersId = Object.keys(this.containers).filter((key) => { return this.containers[key].ingredient === ingredient })
			if(ingredientContainersId.length === 0) {
				ingredient = 'waste'
				ingredientContainersId = Object.keys(this.containers).filter((key) => { return this.containers[key].ingredient === ingredient })
			}
			let i = 0
			const ingredientContainersIdLeng = ingredientContainersId.length
			while(i < ingredientContainersIdLeng) {
				const containerFreeSpace = this.containers[ingredientContainersId[i]].capacity - this.containers[ingredientContainersId[i]].amount
				if(containerFreeSpace > amount) {
					this.containers[ingredientContainersId[i]].amount += amount
					amount = 0
					i++
					break
				}
				this.containers[ingredientContainersId[i]].amount = this.containers[ingredientContainersId[i]].capacity
				amount = amount - containerFreeSpace
				i++
			}
			if(amount === 0) return resolve(ingredient)
			if(ingredient !== 'waste') return this.addIngredient('waste', amount)
			// TODO: make exception when there is no space in waste containers
			return reject(`TODO: make exception when there is no space in waste containers`)
		}).then((ingredient) => {
			if(ingredient !== 'waste') this.checkIngredientsQueue(ingredient)
		}).catch((err) => {
			console.log(err)
		})
	}

	async checkIngredientsQueue(ingredient) {
		return new Promise((resolve, reject) => {
			if(!ingredient) return reject(`'ingredient' must be provided | ${ingredient} given | checkIngredientsQueue function`)
			let topPriorityOutletId
			let topPriority = Infinity
			Object.entries(this.outlets).forEach(([id, outlet]) => {
				if(outlet.status > 0 && outlet.queue && outlet.queue[ingredient]) {
					if(outlet.status < topPriority) {
						topPriority = outlet.status
						topPriorityOutletId = id
					}
				}
			})
			if(topPriorityOutletId){
				this.requestIngredient(ingredient, this.outlets[topPriorityOutletId].queue[ingredient]).then((recivedAmount) => {
					if(recivedAmount > 0) {
						const respIngredient = {[ingredient]: recivedAmount}
						this.outlets[topPriorityOutletId].process.postMessage({header: 'addIngredients', body: respIngredient})
						this.outlets[topPriorityOutletId].bucketLogs[ingredient] += recivedAmount
						delete this.outlets[topPriorityOutletId].queue[ingredient]
					}
				})
			}
		}).catch((err) => { console.log(err) })
	}

	async load(buckets, onBucketReady, slotsNumber) {
		if(!Array.isArray(buckets)) throw new Error(`'buckets' must be an array | ${buckets} given | load function`)
		if(typeof onBucketReady !== 'function') throw new Error(`'onBucketReady' must be a function | ${onBucketReady} given | load function`)
		if(isNaN((slotsNumber = Number(slotsNumber))) || slotsNumber > this.machineSlotsNumber) slotsNumber = this.machineSlotsNumber

		this.onBucketReady = onBucketReady
		const validBuckets = buckets.map((bucket) => {
			if(typeof bucket === 'object'){
				Object.entries(bucket).forEach(([key, value]) => {
					value = Number(value)
					bucket[key] = (!isNaN(value)) ? value : 0
				})
				return bucket
			}
		})
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

			let outlet
			const roLeng = runningOutletsId.length
			i = 0
			while(i < roLeng) {
				outlet = this.outlets[runningOutletsId[i]]
				if(!outlet.process || outlet.liveliness === -2) {
					this.outlets[runningOutletsId[i]].status = -3
					i++
					continue
				}
				this.outlets[runningOutletsId[i]].liveliness = (outlet.liveliness !== undefined) ? outlet.liveliness - 1 : 0
				try {
					this.outlets[runningOutletsId[i]].process.postMessage({header: 'ping'})
				}
				catch(err) {
					console.log(err)
					this.outlets[runningOutletsId[i]].status = -3
				 }
				i++
			}
		}, 200)

		return Promise.all(promiseArray)
	}

	setUpNewOutlet(outletId) {
		return new Promise(async (resolve, reject) => {
			if(isNaN((outletId = Number(outletId)))) outletId = this.outlets.findIndex((outlet) => outlet.status === 0)
			if(outletId === -1) {
				//console.log(this.outlets)
				if(!this.outlets.find((val) => { return val.status > -2 })) {
					console.log('rejecting')
					return reject("There are no outlets available")
				}
				else if(!this.outlets.find((val) => { return val.status === -1 })){
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
			this.outlets[outletId].status = -1
			console.log(`Set up new outlet | outletId: ${outletId}`)
			this.outlets[outletId].process = new Worker('./outlet.mjs', { workerData: this.proportions })
			let bucket = this.buckets.shift()
			this.outlets[outletId].bucketLogs = bucket
			this.outlets[outletId].process.postMessage({header: 'insertBucket', body: bucket})
			this.outlets[outletId].status = this.getNewPriorityLevel()
			this.outlets[outletId].process.on('message', (message) => {
				switch(message.header) {
					case 'requestIngredients':
						Object.entries(message.body).forEach(([ingredient, amount]) => {
							if(!this.outlets[outletId].queue) this.outlets[outletId].queue = {}
							this.outlets[outletId].queue[ingredient] = amount
							this.checkIngredientsQueue(ingredient)
						})
						break
					case 'requestBucket':
						bucket = this.buckets.shift()
						this.outlets[outletId].bucketLogs = bucket
						this.outlets[outletId].process.postMessage({header: 'insertBucket', body: bucket})
						break
					case 'returnBucket':
						bucket = message.body
						switch(message.reason) {
							case 'done':
								this.onBucketReady(bucket)
								if(this.buckets.length === 0) {
									this.outlets[outletId].process.terminate()
									this.outlets[outletId].process = null
									this.outlets[outletId].status = 0
									return resolve()
								}
								this.outlets[outletId].status = this.getNewPriorityLevel()
								bucket = this.buckets.shift()
								this.outlets[outletId].bucketLogs = bucket
								this.outlets[outletId].process.postMessage({header: 'insertBucket', body: bucket})
								break
							case 'error':
								this.buckets.unshift(bucket)
								this.outlets[outletId].status = -1
								return reject('changeOutlet')
							case 'critical error':
								this.buckets.unshift(bucket)
								this.outlets[outletId].process.terminate()
								this.outlets[outletId].process = null
								this.outlets[outletId].status = -2
								return reject('changeOutlet')
						}
						break
					case 'pong':
						this.outlets[outletId].liveliness = 1
						break
					default:
						console.log(`Unknown message | machine | ${message.header}`)
						break
				}
			})
			this.outlets[outletId].process.on('error', (err) => {
				console.log(`${err} | outletId: ${outletId}`)
				this.outlets[outletId].process = null
				this.outlets[outletId].status = -1
				this.buckets.unshift(this.outlets[outletId].bucketLogs)
				this.repairOutlet(outletId).then(() => {
					this.outlets[outletId].status = 0
					console.log(`Outlet was successfully repaired | outletId: ${outletId}`)
				}).catch((err) => {
					this.outlets[outletId].status = -2
					console.log(err)
				})
				return reject('changeOutlet')
			})
		}).catch((err) => {
			if(err === 'changeOutlet') {
				return this.setUpNewOutlet()
			}
			else return Promise.reject(err)
		})
	}

	async requestIngredient(ingredient, reqAmount) {
		return new Promise((resolve, reject) => {
			if(!ingredient) return reject(`'ingredient' must be provided | ${ingredient} given | requestIngredient function`)
			if(isNaN((reqAmount = Number(reqAmount)))) return reject(`'reqAmount' must be a number | ${typeof reqAmount} given | requestIngredient function`)
			const ingredientContainersId = Object.keys(this.containers).filter((key) => { return this.containers[key].ingredient === ingredient })
			if(ingredientContainersId.length === 0) return reject(`There is no '${ingredient}' ingredient | requestIngredient function`)
			let i = 0
			const ingredientContainersIdLeng = ingredientContainersId.length
			let amount
			let collectedAmount = 0
			while(i < ingredientContainersIdLeng) {
				if(collectedAmount === reqAmount) break
				amount = this.containers[ingredientContainersId[i]].amount
				if(amount > 0) {
					if(amount > reqAmount) {
						this.containers[ingredientContainersId[i]].amount -= reqAmount
						collectedAmount += reqAmount
					}
					else {
						this.containers[ingredientContainersId[i]].amount = 0
						collectedAmount += amount
					}
				}
				i++
			}
			return resolve(collectedAmount)
		}).catch((err) => { console.log(err) })
	}

	getNewPriorityLevel() {
		const lastPriorityLevel = Math.max.apply(Math, this.outlets.map((val) => { return  val.status }))
		return (lastPriorityLevel > 0) ? lastPriorityLevel + 1 : 1
	}

	async repairOutlet(outletId) {
		return new Promise(async (resolve, reject) => {
			if(isNaN((outletId = Number(outletId)))) return reject(`'outletId' must be a number | ${typeof outletId} given | repairOutlet function`)
			if(Math.random() * 100 > 50){ // Impossible to repair simulation
				return reject(`Impossible to repair outlet | outletId: ${outletId}`)
			}
			return resolve()
		})
	}

	waitForAvailableOutlet(timeOut) {
		return new Promise((resolve) => {
			if(isNaN((timeOut = Number(timeOut))) || timeOut < 0) timeOut = 8000
			const interval = 200
			const i = 0
			const wfaoInterval = setInterval(() => {
				if(timeOut <= 0){
					clearInterval(wfaoInterval)
					return resolve()
				}
				const outletId = this.outlets.findIndex((outlet) => outlet.status === 0)
				if(outletId !== -1) {
					clearInterval(wfaoInterval)
					return resolve(outletId)
				}
				if(this.outlets.filter((outlet) => outlet.status < -1).length === this.outlets.length) {
					clearInterval(wfaoInterval)
					return resolve()
				}
				timeOut -= interval
			}, interval)
		})
	}
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