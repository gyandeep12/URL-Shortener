require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const shortId = require("shortid")
const createHttpError = require('http-errors')
const path = require("path")
const ejs = require("ejs")
const limiter = require("express-rate-limit")
const ShortUrl = require('./models/url.model')
const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(limiter({
  windowMs: 15 * 60 * 1000,
  max: 100
}))

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
}).then(() => {
  console.log("Connected to Database 💾")
}).catch((err) => console.log(`An Error Occured while connecting: ${err}`))

app.set("view engine", "ejs")
app.get("/", (req, res, next) => {
  res.render("index")
})
app.post("/", async (req, res, next) => {
  try {
    const { url } = req.body
    if (!url) {
      throw createHttpError.BadRequest('Provide a valid url')
    }
    const urlExists = await ShortUrl.findOne({ url })
    if (urlExists) {
      res.render('index', {
        short_url: `${req.headers.host}/${urlExists.shortId}`,
      })
      return
    }
    const shortUrl = new ShortUrl({ url: url, shortId: shortId.generate() })
    const result = await shortUrl.save()
    res.render('index', {
      short_url: `${req.headers.host}/${result.shortId}`,
    })
  } catch (error) {
    next(error)
  }
})
app.get('/:shortId', async (req, res, next) => {
  try {
    const { shortId } = req.params
    const result = await ShortUrl.findOne({ shortId })
    if (!result) {
      throw createHttpError.NotFound('Short url does not exist')
    }
    res.redirect(result.url)
  } catch (error) {
    next(error)
  }
})

app.use((req, res, next) => {
  next(createHttpError.NotFound())
})

app.use((err, req, res, next) => {
  res.status(err.status || 500)
  res.render("index", { error: err.message })
})


const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server is running on port ${port}🌏`)
})