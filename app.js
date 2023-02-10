'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaRequest = require('koa-http-request');
const views = require('koa-views');
const serve = require('koa-static');

const mongo = require('mongodb');

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

const GITHUB_CLIENT_ID = `${process.env.MY_GITHUB_CLIENT_ID}`;
const GITHUB_CLIENT_SECRET = `${process.env.MY_GITHUB_CLIENT_SECRET}`;
const GITHUB_API_VERSION = `${process.env.MY_GITHUB_API_VERSION}`;
const GITHUB_MAX_COUNT = parseInt(`${process.env.MY_GITHUB_MAX_COUNT}`);

const OPENAI_API_KEY = `${process.env.MY_OPENAI_API_KEY}`;

const MONGO_URL = `${process.env.MY_MONGO_URL}`;
const MONGO_DB_NAME = `${process.env.MY_MONGO_DB_NAME}`;
const MONGO_COLLECTION = 'github_code_evaluator_by_open_ai';

router.get('/', async (ctx, next) => {
  console.log("+++++++++ / ++++++++++");
  await ctx.render('top', {
    "q": 'Shopify sample',
    "sentence": 'Could you evaluate this source code for learning how to develop Shopify apps?',
    "tag": '',
    "total_count": 0
  });
});

router.get('/search', async (ctx, next) => {
  console.log("+++++++++ /search ++++++++++");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);
  const q = ctx.request.query.q;
  const sentence = ctx.request.query.sentence;
  const u = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=https://${ctx.request.host}/result%3Fq%3D${q}%26sentence%3D${sentence}`;
  console.log(`Redirecting... ${u}`);
  ctx.redirect(u);
});

router.get('/result', async (ctx, next) => {
  console.log("+++++++++ /result ++++++++++");
  console.log(`${JSON.stringify(ctx.request.query)}`);

  const code = ctx.request.query.code;
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
    console.log(`${e}`);
  }
  res = JSON.parse(res);
  console.log(`${JSON.stringify(res, null, 4)}`);

  const access_token = res.access_token;
  const q = ctx.request.query.q;
  res = {};
  try {
    res = await ctx.get('https://api.github.com/search/repositories', {
      "q": `${q.replace(/ /g, '+')}`,
      "sort": "stars",
      "order": "desc",
      "per_page": GITHUB_MAX_COUNT
    }, {
      "User-Agent": 'MyTestApp1',
      "Accept": 'application/vnd.github+json',
      "Authorization": `Bearer ${access_token}`,
      "X-GitHub-Api-Version": `${GITHUB_API_VERSION}`
    });
    //console.log(`${res}`);
  } catch (e) {
    console.log(`${e}`);
  }
  res = JSON.parse(res);

  let total_count = res.total_count;
  if (total_count > GITHUB_MAX_COUNT) total_count = GITHUB_MAX_COUNT;
  console.log(`total_count: ${total_count}`);

  const sentence = ctx.request.query.sentence;
  const tag = generateTag();

  evaluate(ctx, res.items, sentence, tag);

  await ctx.render('top', {
    "q": q,
    "sentence": sentence,
    "tag": tag,
    "total_count": total_count
  });

});

const evaluate = async (ctx, items, sentence, tag) => {
  let prompt = null;
  let r = null;
  for (const i of items) {
    try {
      console.log(`Evaluating... ${i.html_url}`);
      prompt = `The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.\nHuman: Hello, who are you?\nAI: I am an AI created by OpenAI. How can I help you today?\nHuman: ${sentence} ${i.html_url}`;
      console.log(prompt);
      r = JSON.parse(await ctx.post('https://api.openai.com/v1/completions', {
        "model": "text-davinci-003",
        "prompt": prompt,
        "temperature": 0.9,
        "max_tokens": 650,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0.6,
        "stop": [" Human:", " AI:"]
      }, {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": 'application/json'
      }));
      console.log(`${JSON.stringify(r, null, 4)}`);
      insertDB(tag, {
        "repository": `${i.html_url}`,
        "stars": i.stargazers_count,
        "watchers": i.watchers_count,
        "forks": i.forks_count,
        "score": i.score,
        "openAI_comment": `${r.choices[0].text.replace(/.*\nAI: /, '').replace(/\n/g, '')}`
      });
    } catch (e) {
      console.log(`${e}`);
    }
  }
}

router.get('/refresh', async (ctx, next) => {
  console.log("+++++++++ /refresh ++++++++++");
  const tag = ctx.request.query.tag;
  let count = 0;
  if (tag != '') {
    const res = await (findDB(tag));
    count = res.length;
  }

  ctx.set('Content-Type', 'application/json');
  ctx.body = {
    "count": count
  };
});

router.get('/csv', async (ctx, next) => {
  console.log("+++++++++ /csv ++++++++++");
  const tag = ctx.request.query.tag;

  const res = await (findDB(tag));
  let csv = "";
  csv = (`"repository","stars","watchers","forks","score","penAI_comment"\n`);
  for (const r of res) {
    csv = csv + `"${r.data.repository}","${r.data.stars}","${r.data.watchers}","${r.data.forks}","${r.data.score}","${r.data.openAI_comment}"\n`;
  }

  ctx.set('Content-Type', 'text/plain');
  ctx.body = csv;
});

const generateTag = function () {
  return new Date().getTime().toString(16) + Math.floor(1000 * Math.random()).toString(16);
};

const insertDB = function (tag, data) {
  return new Promise(function (resolve, reject) {
    mongo.MongoClient.connect(MONGO_URL).then(function (db) {
      //console.log(`insertDB Connected: ${MONGO_URL}`);
      var dbo = db.db(MONGO_DB_NAME);
      //console.log(`insertDB Used: ${MONGO_DB_NAME}`);
      console.log(`insertDB insertOne, tag:${tag}`);
      dbo.collection(MONGO_COLLECTION).insertOne({ "tag": tag, "data": data }).then(function (res) {
        db.close();
        return resolve(0);
      }).catch(function (e) {
        console.log(`insertDB Error ${e}`);
      });
    }).catch(function (e) {
      console.log(`insertDB Error ${e}`);
    });
  });
};

const findDB = function (tag, withData = false) {
  return new Promise(function (resolve, reject) {
    mongo.MongoClient.connect(MONGO_URL).then(function (db) {
      //console.log(`getDB Connected ${MONGO_URL}`);
      var dbo = db.db(MONGO_DB_NAME);
      //console.log(`getDB Used ${MONGO_DB_NAME}`);
      console.log(`getDB find, tag:${tag}`);
      let q = { "tag": `${tag}` };
      if (withData) q['data.data'] = { $ne: "" };
      dbo.collection(MONGO_COLLECTION).find(q, { "projection": { "_id": 0, "tag": 1, "data": 1 } }).toArray().then(function (res) {
        db.close();
        if (res == null) return resolve(null);
        return resolve(res);
      }).catch(function (e) {
        console.log(`getDB Error ${e}`);
        return resolve(null);
      });
    }).catch(function (e) {
      console.log(`getDB Error ${e}`);
      return resolve(null);
    });
  });
};

app.use(router.routes());
app.use(router.allowedMethods());

if (!module.parent) app.listen(process.env.PORT || 3000);