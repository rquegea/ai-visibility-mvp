import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Obtener el brand del query parameter
    const brand = searchParams.get('brand') || 'lotus'
    
    // Crear query string sin el brand (ya lo usamos en la URL)
    const otherParams = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (key !== 'brand') {
        otherParams.append(key, value)
      }
    })
    
    const queryString = otherParams.toString()
    
    // Construir URL del backend con brand en la ruta
    const backendUrl = `${API_BASE_URL}/api/query-visibility/${brand}${queryString ? `?${queryString}` : ''}`
    
    console.log('Proxy request to:', backendUrl) // Para debug
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Query Visibility API Proxy Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch query visibility data', details: error.message },
      { status: 500 }
    )
  }
}