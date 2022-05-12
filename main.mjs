'use strict'

import { Worker } from 'worker_threads'

class Machine {

	milk = 0
	cacao = 0
	buckets = []

	milkProportion = 0.8
	cacaoProportion = 0.2

	maxSlots = 2
	workers = []

	milkQueue = []
	cacaoQueue = []

	constructor(milkProportion, cacaoProportion, maxSlots) {
		if(milkProportion && typeof milkProportion == 'number') this.milkProportion = milkProportion
		if(cacaoProportion && typeof cacaoProportion == 'number') this.cacaoProportion = cacaoProportion
		if(maxSlots && typeof maxSlots == 'number') this.maxCapacity = maxSlots
	}

	addMilk(amount) {
		if(typeof amount != 'number') throw new Error("'amount' must be a number, not a " + typeof amount)
		this.milk += amount
	}

	addCacao(amount) {
		if(typeof amount != 'number') throw new Error("'amount' must be a number, not a " + typeof amount)
		this.cacao += amount
	}

	async load(buckets, onBucketReady) {
		if(typeof buckets != 'object') throw new Error("'buckets' must be an array, not a " + typeof buckets)
		if(typeof onBucketReady != 'function') throw new Error("'onBucketReady' must be a function, not a " + typeof onBucketReady)
		this.buckets = buckets

		for(let i = 0; i < this.maxSlots; i++) {
			this.setUpNewWorker()
		}
		await this.workersStartWorking()
	}

	setUpNewWorker(){
		this.workers.push(new Worker('./worker.mjs'))
	}

	async workersStartWorking(){
		for (let i = 0; i < this.workers.length; i++) {
			this.workers[i].postMessage({header: 'insertNewBucket', body: this.buckets.shift()})
			this.workers[i].on('message', (message) => {
				if(message.header == 'requestMilk') {
					if(this.milk > 0) {
						if(this.milk > message.body) {
							this.milk -= message.body
							this.workers[i].postMessage({header: 'addMilk', body: message.body})
						}
						else {
							this.milk = 0
							this.workers[i].postMessage({header: 'addMilk', body: this.milk})
						}
					}
					else{
						this.milkQueue.push({worker: this.workers[i], amount: message.body})
					}
				}
				else if(message.header == 'requestCacao') {
					if(this.cacao > 0) {
						if(this.cacao > message.body) {
							this.cacao -= message.body
							this.workers[i].postMessage({header: 'addCacao', body: message.body})
						}
						else {
							this.cacao = 0
							this.workers[i].postMessage({header: 'addCacao', body: this.cacao})
						}
					}
					else{
						this.cacaoQueue.push({worker: this.workers[i], amount: message.body})
					}
				}
			})
			/*.then((message) => {
				console.log(message)
			})
			.catch((error) => {
				console.log(error)
			})*/
		}
	}

}


(async () => {
	//JSON parse is faster than JS literal - https://www.youtube.com/watch?v=ff4fgQxPaO0
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

	await machine.load(buckets, onBucketReady)

	clearInterval(job)

	console.log('Finished filling all the buckets')
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