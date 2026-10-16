
export default async (request) => {
  try {
    const incomingUrl = new URL(request.url)
    const apiUrl = new URL(
      'https://oss.exercisedb.dev/api/v1/exercises'
    )

    const limit = incomingUrl.searchParams.get('limit') || '100'
    const cursor = incomingUrl.searchParams.get('cursor')

    apiUrl.searchParams.set('limit', limit)

    if (cursor) {
      apiUrl.searchParams.set('cursor', cursor)
    }

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    const body = await response.text()

    if (!response.ok) {
      console.error(
        '[ExerciseDB] Erro da API externa:',
        response.status,
        body
      )

      return Response.json(
        {
          success: false,
          error: 'A biblioteca de exercícios está temporariamente indisponível.',
          upstreamStatus: response.status,
        },
        { status: 502 }
      )
    }

    let payload

    try {
      payload = JSON.parse(body)
    } catch {
      return Response.json(
        {
          success: false,
          error: 'A API retornou uma resposta inválida.',
        },
        { status: 502 }
      )
    }

    if (!Array.isArray(payload.data)) {
      return Response.json(
        {
          success: false,
          error: 'O formato da biblioteca é diferente do esperado.',
        },
        { status: 502 }
      )
    }

    return Response.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('[ExerciseDB] Erro:', error)

    return Response.json(
      {
        success: false,
        error: 'Não foi possível consultar a biblioteca de exercícios.',
      },
      { status: 502 }
    )
  }
}
