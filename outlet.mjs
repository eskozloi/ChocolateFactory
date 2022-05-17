'use strict'

import { parentPort, workerData } from 'worker_threads'

const proportions = workerData

let bucket

const insertBucket = (newBucket) => {
  bucket = newBucket
  scanBucket()
}

const addIngredient = (ingredient, amount) => {
  bucket[ingredient] += amount
  scanBucket(ingredient)
}

const scanBucket = (reqIngredient) => {
  let ingredients = {}
  Object.entries(proportions).forEach(([ingredient, ratio]) => {
    const reqAmount = bucket.capacity * ratio - bucket[ingredient]
    if(reqAmount !== 0) ingredients[ingredient] = reqAmount
  })
  if(Object.keys(ingredients).length !== 0) {
    if(reqIngredient) {
      if(!ingredients[reqIngredient]) return
      ingredients = {[reqIngredient]: ingredients[reqIngredient]}
    }
    parentPort.postMessage({header: 'requestIngredients', body: ingredients})
  }
  else parentPort.postMessage({header: 'returnBucket', body: bucket, reason: 'done'})
}

const livelinessCheck = setInterval(() => {
  //if(Math.random() * 100 > 70) parentPort.postMessage('requestCleanup') // Clogged pipes simulation
  if(Math.random() * 100 > 98) throw new Error('Something went wrong with the outlet') // Error simulation
  if(!bucket) parentPort.postMessage({header: 'requestBucket'})
}, 200)

parentPort.on('message', (message) => {
  switch(message.header) {
    case 'addIngredients':
      Object.entries(message.body).forEach(([ingredient, amount]) => {addIngredient(ingredient, amount)})
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
})