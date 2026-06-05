import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

export default function RankingLoading() {
  return (
    <Box sx={{ display: 'flex', gap: 3 }}>
      <Box sx={{ flex: '0 0 68%', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="rounded" height={340} />
        <Skeleton variant="rounded" height={280} />
        <Skeleton variant="rounded" height={320} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="rounded" height={400} />
      </Box>
    </Box>
  )
}
