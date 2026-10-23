export type OperationLog = {
  id: string
  action: string
  resourceType: string
  resourceId: string | null
  detail: string
  success: boolean
  message: string | null
  createdAt: string
}

export type OperationLogPage = {
  content: OperationLog[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export type OperationLogStats = {
  total: number
  success: number
  failed: number
}

export type OperationLogQuery = {
  page?: number
  size?: number
  success?: boolean
}
