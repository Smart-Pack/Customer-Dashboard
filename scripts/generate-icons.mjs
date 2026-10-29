import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

/**
 * Generates the assets directory if it does not already exist.
 */
await mkdir('assets', { recursive: true })

/**
 * Generates the Android adaptive icon foreground from the SmartPack SVG logo.
 *
 * Resizes the navy-blue logo to fit within a 700 × 700 pixel area, preserving
 * its aspect ratio and transparency. Adds transparent padding to produce a
 * final 1024 × 1024 pixel PNG.
 */
await sharp('public/favicon.svg')
  .resize(700, 700, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .extend({
    top: 162,
    bottom: 162,
    left: 162,
    right: 162,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile('assets/icon-foreground.png')

/**
 * Generates the Android adaptive icon background.
 *
 * Creates a solid white 1024 × 1024 pixel PNG to provide contrast against
 * the navy-blue logo in the foreground.
 */
await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: '#ffffff',
  },
})
  .png()
  .toFile('assets/icon-background.png')

console.log('SmartPack Android icons generated.')
