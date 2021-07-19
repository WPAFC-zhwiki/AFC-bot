import { config as dotenvConfig } from 'dotenv'
dotenvConfig( { path: process.cwd() + "/.env" } )

import 'src/modules/icg/main'
import 'src/modules/events'