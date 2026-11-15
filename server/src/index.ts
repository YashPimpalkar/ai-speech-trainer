import { config } from './config.js'
import { buildApp } from './bootstrap.js'

buildApp().listen(config.port, () => console.log(`API on http://localhost:${config.port}`))
