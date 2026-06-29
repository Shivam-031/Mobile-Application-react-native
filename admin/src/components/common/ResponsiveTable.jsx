'use client';

// ResponsiveTable — breakpoint-aware MUI Table wrapper.
//
// Renders a normal MUI Table on ≥ md screens and a stacked card list on
// < md. Per-page mobile cards (not a generic key/value stack) so each page
// controls its own information density. The wrapper owns the Card chrome,
// empty/loading state, and keying; pages supply renderRow + renderMobileCard.
//
// API:
//   <ResponsiveTable
//     headers={['Product', 'Category', /* ... */]}
//     rows={filtered}
//     rowKey={(p) => p._id}
//     renderRow={(p, i) => (<><TableCell>...</TableCell></>)}
//     renderMobileCard={(p) => (<Box>...</Box>)}
//     loading={false}
//     emptyMessage="No products match your filters"
//   />

import {
  Table, TableHead, TableBody, TableRow, TableCell,
  Card, Box, CircularProgress, useMediaQuery, useTheme,
} from '@mui/material';
import { Fragment } from 'react';

export default function ResponsiveTable({
  headers,
  rows,
  rowKey,
  renderRow,
  renderMobileCard,
  loading = false,
  emptyMessage = 'No data',
  mobileCardSx,
}) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  // ---- Desktop: standard MUI Table ----
  if (isMdUp) {
    return (
      <Table>
        <TableHead sx={{ backgroundColor: '#f8f8f8' }}>
          <TableRow>
            {headers.map((h) => (
              <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={headers.length} align="center" sx={{ py: 6 }}>
                <CircularProgress size={32} />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((item, i) => (
              <TableRow key={rowKey(item, i)} hover>
                {renderRow(item, i)}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  }

  // ---- Mobile: stacked card list ----
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }
  if (rows.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary', fontSize: 14 }}>
        {emptyMessage}
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {rows.map((item, i) => (
        <Fragment key={rowKey(item, i)}>
          <Card
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              ...(mobileCardSx || {}),
            }}
          >
            {renderMobileCard(item, i)}
          </Card>
        </Fragment>
      ))}
    </Box>
  );
}