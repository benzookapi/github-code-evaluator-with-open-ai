1. npm install

2. add enviromental variables

```
export MY_GITHUB_API_VERSION=2022-11-28
export MY_GITHUB_CLIENT_ID=YOUR_ID
export MY_GITHUB_CLIENT_SECRET=YOUR_SECRET
export MY_GITHUB_MAX_COUNT=100
export MY_MONGO_DB_NAME=YOUR_NAME
export MY_MONGO_URL=YOUR_MONGO_DB_URL (e.g. mongodb://my_db_id:my_db_password@my_company_db.com:9999/my_db_1)

```

3. Set up a ppublic URL like ngrok linked to localhost:3000 for your GitHub application URL and callback (the callback nedds to be `YOUR_APP_URL/result`).

4. npm start

5. access YOUR_PUBLIC_URL (e.g. https://********.jp.ngrok.io)


