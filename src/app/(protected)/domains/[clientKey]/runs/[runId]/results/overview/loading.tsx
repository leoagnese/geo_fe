import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

export default function OverviewLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={110} sx={{ flex: 1 }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={320} />
      <Skeleton variant="rounded" height={240} />
    </Box>
  )
}
