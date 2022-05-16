'use strict'

import { parentPort, workerData } from 'worker_threads'

//let bucketNuber = workerData

const proportions = workerData

let bucket

const insertBucket = (newBucket) => {
  //console.log(`Adding ${amount}units of milk to bucket ${bucket.id}`)
  //console.log(newBucket)
  bucket = newBucket
  console.log('Inserting bucket')
  console.log(bucket)
  console.log(proportions)
  scanBucket()
}

/*const addMilk = (amount) => {
  //console.log(`Adding ${amount}units of milk to bucket ${bucket.id}`)
  console.log(`Adding ${amount}units of milk to the bucket`)
  bucket.milk += amount
}

const addCacao = (amount) => {
  //console.log(`Adding ${amount}units of cacao to bucket ${bucket.id}`)
  console.log(`Adding ${amount}units of cacao to the bucket`)
  bucket.cacao += amount
}*/

const addIngredient = (ingredient, amount) => {
  bucket[ingredient] += amount
  scanBucket()
}

const scanBucket = () => {
  /*let ingredients = proportions.forEach(([ingredient, ratio]) => {
    const reqAmount = bucket.capacity * ratio - bucket[ingredient]
    if (reqAmount > 0) return proportions[ingredient] = reqAmount
  })*/
  let ingredients = {}
  Object.entries(proportions).forEach(([ingredient, ratio]) => {
    const reqAmount = bucket.capacity * ratio - bucket[ingredient]
    if(reqAmount !== 0) ingredients[ingredient] = reqAmount
  })
  console.log(ingredients)
  if(ingredients.length !== 0) parentPort.postMessage({header: 'requestIngredients', body: ingredients})
  else parentPort.postMessage({header: 'returnBucket', body: bucket, reason: 'done'})
}

const livelinessCheck = setInterval(() => {
  console.log('here')
  //if(Math.random() * 100 > 70) parentPort.postMessage('requestCleanup') // Clogged pipes simulation
  if(Math.random() * 100 > 95) throw new Error('Something went wrong with the outlet') // Error simulation
  if(!bucket) parentPort.postMessage({header: 'requestBucket'})
}, 4000)

parentPort.on('message', (message) => {
  console.log('outlete is here '+message.header)
  switch(message.header) {
    case 'addIngredients':
      Object.entries(message.ingredients).forEach(([ingredient, amount]) => {addIngredient(ingredient, amount)})
      break
    case 'insertBucket':
      insertBucket(message.body)
      break
    case 'requestBucket':
      parentPort.postMessage({header: 'returnBucket', body: bucket, reason: message.reason})
      break
    case 'ping':
      parentPort.postMessage({header: 'pong'})
      break
    default:
      console.log(`Unknown message | outlet | ${message.header}`)
      break
  }
  /*if(typeof message === 'object') {
    console.log(`Received message: ${message.header}`)
    if(message.header === 'addMilk') addMilk(message.body)
    else if(message.header === 'addCacao') addCacao(message.body)
    else if(message.header === 'insertBucket') insertBucket(message.body)
    else if(message.header === 'requestBucket') {
      parentPort.postMessage({header: 'returnBucket', reason: 'request', body: bucket})
      bucket = undefined
    }
    else if(message.header === 'ping') parentPort.postMessage('pong')
  }*/
  /*else {
    if(message === 'ping') parentPort.postMessage('pong')
    else if(message === 'requestBucket') {
      parentPort.postMessage({header: 'returnBucket', reason: 'request', body: bucket})
      bucket = undefined
    }
  }*/
})