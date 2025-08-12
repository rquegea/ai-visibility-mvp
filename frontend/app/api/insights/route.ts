import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    
    const response = await fetch(
      `${API_BASE_URL}/api/insights${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Insights API Proxy Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights data' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const insightId = pathSegments[pathSegments.length - 1]
    
    const body = await request.json()
    
    const response = await fetch(
      `${API_BASE_URL}/api/insights/${insightId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      }
    )
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Insights PATCH API Proxy Error:', error)
    return NextResponse.json(
      { error: 'Failed to update insight' },
      { status: 500 }
    )
  }
}