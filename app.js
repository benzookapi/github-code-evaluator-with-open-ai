'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaRequest = require('koa-http-request');
const views = require('koa-views');
const serve = require('koa-static');

const fs = require('fs');

//const mongo = require('mongodb');

const co = require('co');

const { resolve } = require('path');
const { reject } = require('underscore');
const { POINT_CONVERSION_COMPRESSED } = require('constants');

const router = new Router();
const app = module.exports = new Koa();

app.use(bodyParser());

app.use(koaRequest({
  
}));

app.use(views(__dirname + '/views', {
  map: {
    html: 'underscore'
  }
}));

app.use(serve(__dirname + '/public'));

// Mongo URL and DB name for date store
//const MONGO_URL = `${process.env.MY_MONGO_URL}`;
//const MONGO_DB_NAME = `${process.env.MY_MONGO_DB_NAME}`;
//const MONGO_COLLECTION = 'googlesearchscraper';

//const SEARCH_URL = 'https://www.google.com/search';
//const MAX_COUNT = parseInt(`${process.env.MY_MAX_COUNT}`);

router.get('/',  async (ctx, next) => {  
  console.log("+++++++++ / ++++++++++");



  await ctx.render('top', {
    
  });  
});

router.post('/',  async (ctx, next) => {  
  console.log("+++++++++ / ++++++++++");



  

  await ctx.render('top', {
   
  });
  
});

/* ---  HTTP access common function--- */
const accessEndpoint = function (ctx, endpoint, req, token = null, content_type = CONTENT_TYPE_JSON) {
  console.log(`[ accessEndpoint ] POST ${endpoint} ${JSON.stringify(req)}`);
  return new Promise(function (resolve, reject) {
    // Success callback
    let then_func = function (res) {
      console.log(`[ accessEndpoint ] Success: POST ${endpoint} ${res}`);
      return resolve(JSON.parse(res));
    };
    // Failure callback
    let catch_func = function (e) {
      console.log(`[ accessEndpoint ] Failure: POST ${endpoint} ${e}`);
      return reject(e);
    };
    let headers = {};
    headers['Content-Type'] = content_type;
    if (token != null) {
      headers['X-Shopify-Access-Token'] = token;
      // NOTE THAT currently the following three headers are neccessary for Payment App API calls as of late 2021 unlike Admin APIs.
      headers['Content-Length'] = Buffer.byteLength(JSON.stringify(req));
      headers['User-Agent'] = 'My_Payments_App';
      headers['Host'] = endpoint.split('/')[2];
    }
    console.log(`[ accessEndpoint ] ${JSON.stringify(headers)}`);
    ctx.post(endpoint, req, headers).then(then_func).catch(catch_func);
  });
};



/*
const insertDB = function(tag, data) {
  return new Promise(function (resolve, reject) { mongo.MongoClient.connect(MONGO_URL).then(function(db){
    //console.log(`insertDB Connected: ${MONGO_URL}`);
    var dbo = db.db(MONGO_DB_NAME);    
    //console.log(`insertDB Used: ${MONGO_DB_NAME}`);
    console.log(`insertDB insertOne, tag:${tag}`);
    dbo.collection(MONGO_COLLECTION).insertOne({"tag": tag, "data": data}).then(function(res){
      db.close();
      return resolve(0);
    }).catch(function(e){
      console.log(`insertDB Error ${e}`);
    });
  }).catch(function(e){
    console.log(`insertDB Error ${e}`);
  });});
};

const findDB = function(tag, withData = false) {
  return new Promise(function(resolve, reject) { mongo.MongoClient.connect(MONGO_URL).then(function(db){
    //console.log(`getDB Connected ${MONGO_URL}`);
    var dbo = db.db(MONGO_DB_NAME);    
    //console.log(`getDB Used ${MONGO_DB_NAME}`);
    console.log(`getDB find, tag:${tag}`);
    let q = {"tag": `${tag}`};
    if (withData) q['data.data'] = { $ne: "" };
    dbo.collection(MONGO_COLLECTION).find(q, {"projection": {"_id":0, "tag":1, "data":1}}).toArray().then(function(res){
      db.close();
      if (res == null) return resolve(null);
      return resolve(res);
    }).catch(function(e){
      console.log(`getDB Error ${e}`);
      return resolve(null);
    });
  }).catch(function(e){
    console.log(`getDB Error ${e}`);
    return resolve(null);
  });});
};
*/

app.use(router.routes());
app.use(router.allowedMethods());

if (!module.parent) app.listen(process.env.PORT || 3000);