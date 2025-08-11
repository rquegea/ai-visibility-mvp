"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Play, Pause, Edit, Trash } from 'lucide-react'

// Mock data
const queries = [
  {
    id: 1,
    name: 'Brand Mention - Cookies',
    language: 'en',
    brand: 'Cookie Co',
    status: 'active',
    mentions: 245,
    lastRun: '2024-01-07 10:30'
  },
  {
    id: 2,
    name: 'Competitor Analysis',
    language: 'en',
    brand: 'Moët & Chandon',
    status: 'paused',
    mentions: 89,
    lastRun: '2024-01-06 15:45'
  },
  {
    id: 3,
    name: 'Product Reviews',
    language: 'fr',
    brand: 'Cookie Co',
    status: 'active',
    mentions: 156,
    lastRun: '2024-01-07 09:15'
  }
]

export default function QueriesPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredQueries = queries.filter(query =>
    query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.brand.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Queries</h1>
          <p className="text-muted-foreground">
            Manage your search queries and monitoring rules
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Query
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Query Name</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mentions</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQueries.map((query) => (
                <TableRow key={query.id}>
                  <TableCell className="font-medium">{query.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{query.language.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{query.brand}</TableCell>
                  <TableCell>
                    <Badge variant={query.status === 'active' ? 'default' : 'secondary'}>
                      {query.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{query.mentions}</TableCell>
                  <TableCell className="text-muted-foreground">{query.lastRun}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {query.status === 'active' ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Resume
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
