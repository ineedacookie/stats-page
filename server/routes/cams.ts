import { Router } from 'express'

import { LiveCamService } from '../services/liveCamService.js'

const readQueryString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

export const createCamsRouter = (camService: LiveCamService): Router => {
  const router = Router()

  // Returns a currently-live cam and the direct HLS URL the client plays. The
  // streams are ad-free and CORS-open, so no server-side proxy is required.
  router.get('/cams/next', async (request, response) => {
    const excludeId = readQueryString(request.query.exclude)
    const selection = await camService.pickNext({ excludeId })

    if (!selection) {
      response
        .status(503)
        .json({ error: 'No live animal cams are available right now.' })
      return
    }

    response.json(selection)
  })

  return router
}
