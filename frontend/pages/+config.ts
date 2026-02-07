import type { Config } from 'vike/types'
import vikeReact from 'vike-react/config'

export default {
  extends: vikeReact,
  title: 'TaleTinker',
  description: 'Create and read collaborative AI stories.',
  clientRouting: false,
} satisfies Config
