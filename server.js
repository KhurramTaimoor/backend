const express = require("express");
const cors = require("cors");

const app = express();

const allowedOrigins = [
  "https://alibirdcageofficial.online",
  "https://www.alibirdcageofficial.online",
  "https://app.alibirdcageofficial.online",

  "https://alibirdcageofficial.store",
  "https://www.alibirdcageofficial.store",
  "https://app.alibirdcageofficial.store",

  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin(origin, callback) {
    console.log("REQUEST ORIGIN:", origin);

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("CORS BLOCKED:", origin);

    return callback(
      new Error(`Not allowed by CORS: ${origin}`)
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Origin",
    "Content-Type",
    "Accept",
    "Authorization",
    "X-Requested-With",
  ],

  credentials: true,

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// YE LINE MAT RAKHNA
// app.options("*", cors(corsOptions));

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);
