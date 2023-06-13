import bodyParser from 'body-parser';
import express from 'express';
import { existsSync, readFileSync, writeFile } from 'fs';
import { createServer } from 'http';
import yaml from 'yaml';

const app = express()
const server = createServer(app);
const optionsYaml = readFileSync("./options.yml", {encoding: 'utf-8'});
const options = yaml.parse(optionsYaml)
app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}))

app.set('view engine', 'ejs');
app.use('/', express.static('public'))

const voteResults = existsSync("./results.json") ? JSON.parse(readFileSync("./results.json")) : {}

app.use((req, res, next) => {
  console.log("Processing " + req.method + " \"" + req.path + "\" for " + req.ip + " at " + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''))
  next()
})


app.get('/', (req, res) => {
  res.render('index', { choices: options.choiceGroups })
})
app.post('/vote', (req, res) => {
  const securityCode = req.body["security-code"]
  Object.keys(options.choiceGroups).forEach(key => {
    const voteKey = req.body["vote-" + key];
    voteResults[key] ||= {}
    voteResults[key][voteKey] ||= 0;
    voteResults[key][voteKey] += 1;
  });
  if(securityCode != options.securityCode) {
    res.sendStatus(401)
    return
  }

  writeFile("./results.json", JSON.stringify(voteResults), {encoding: 'utf-8'}, ()=>{})

  res.header("Location", "/success")
  res.status(303)
  res.end()
})

app.get('/success', (req, res) => {
  res.render('success')
})

app.post('/verifycode', (req, res) => {
  const securityCode = req.header("pass")
  if (securityCode != options.securityCode) {
    res.sendStatus(204)
    return
  }
  res.sendStatus(200)
})

app.get('/getresults', (req, res) => {
  if (req.query.code != options.securityCode) {
    res.sendStatus(401)
    return
  }

  res.render('results', { results: voteResults, choices: options.choiceGroups })
})
const port = process.env.PORT || 3000
const path = "192.168.0.192"
server.listen(port, path, () => {
  console.log(`Voting server listening on http://${path}:${port}`)
})