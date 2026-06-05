import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

export default function KeywordsLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Skeleton variant="rounded" height={400} />
      <Skeleton variant="rounded" height={56} />
      <Skeleton variant="rounded" height={300} />
    </Box>
  )
}
