'use strict'

import { parentPort, workerData } from 'worker_threads'

let bucketNuber = workerData

let bucket

const insertNewBucket = (newBucket) => {
  console.log(`Adding ${amount}units of milk to bucket ${bucket.id}`)
  bucket = newBucket
}

const addMilk = (amount) => {
  console.log(`Adding ${amount}units of milk to bucket ${bucket.id}`)
  bucket.milk += amount
}

const addCacao = (amount) => {
  console.log(`Adding ${amount}units of cacao to bucket ${bucket.id}`)
  bucket.cacao += amount
}

parentPort.once('message', (message) => {
  console.log(`Received message: ${message}`)
  if(message.header == 'insertNewBucket') {
    insertNewBucket(message.body)
  }
  else if(message.header == 'addMilk') {
    addMilk(message.body)
  }
  else if(message.header == 'addCacao') {
    addCacao(message.body)
  }
})