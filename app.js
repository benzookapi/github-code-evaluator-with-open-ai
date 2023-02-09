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

const GITHUB_CLIENT_ID = `${process.env.GITHUB_CLIENT_ID}`;
const GITHUB_CLIENT_SECRET = `${process.env.GITHUB_CLIENT_SECRET}`;


// Mongo URL and DB name for date store
//const MONGO_URL = `${process.env.MY_MONGO_URL}`;
//const MONGO_DB_NAME = `${process.env.MY_MONGO_DB_NAME}`;
//const MONGO_COLLECTION = 'googlesearchscraper';

//const SEARCH_URL = 'https://www.google.com/search';
//const MAX_COUNT = parseInt(`${process.env.MY_MAX_COUNT}`);

router.get('/', async (ctx, next) => {
  console.log("+++++++++ / ++++++++++");
  await ctx.render('top', {
    "q": '',
    "res": ''
  });
});

router.get('/search', async (ctx, next) => {
  console.log("+++++++++ /search ++++++++++");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);

  const q = ctx.request.query.q;

  const u = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=https://${ctx.request.host}/callback%3Fq%3D${q}`;

  console.log(`Redirecting... ${u}`);

  ctx.redirect(u);

});

router.get('/callback', async (ctx, next) => {
  console.log("+++++++++ /callback ++++++++++");
  console.log(`${JSON.stringify(ctx.request.query)}`);

  const code = ctx.request.query.code;

  const q = ctx.request.query.q;

  let res = {};
  try {
    res = await ctx.post(`https://github.com/login/oauth/access_token`, {
      "client_id": GITHUB_CLIENT_ID,
      "client_secret": GITHUB_CLIENT_SECRET,
      "code": code
    }, {
      "Accept": 'application/json'
    });
  } catch (e) {
    console.log(`${JSON.stringify(e)}`);
  }

  res = JSON.parse(res);

  console.log(`${JSON.stringify(res, null, 4)}`);

  const access_token = res.access_token;

  console.log(`access_token: ${access_token}`);

  res = {};
  try {
    res = await ctx.get('https://api.github.com/search/repositories', {
      "q": `${q.replace(/ /g, '+')}`
    }, {
      "User-Agent": 'MyTestApp1',
      "Accept": 'application/vnd.github+json',
      "Authorization": `Bearer ${access_token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    });
  } catch (e) {
    console.log(`${e}  ${JSON.stringify(e)}`);
  }

  res = JSON.parse(res);

  await ctx.render('top', {
    "q": q,
    "res": JSON.stringify(res, null, 4)
  });

});


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