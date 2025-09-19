/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  sassOptions: {
    includePaths: ['./styles'],
  },
  outputFileTracingRoot: path.join(__dirname, '../'),
}

module.exports = nextConfig
