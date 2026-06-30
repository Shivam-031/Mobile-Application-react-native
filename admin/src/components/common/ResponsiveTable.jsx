'use client';

// ResponsiveTable — breakpoint-aware MUI Table wrapper.
//
// Renders a normal MUI Table on ≥ md screens and a stacked card list on
// < md. Per-page mobile cards (not a generic key/value stack) so each page
// controls its own information density. The wrapper owns the Card chrome,
// empty/loading state, and keying; pages supply renderRow + renderMobileCard.
//
// IMPORTANT — renderRow contract: renderRow returns the *cells* of one row
// (a fragment of <TableCell> children). The wrapper renders its own
// <TableRow> around them, so the page can supply per-row styling via the
// `rowSx` prop and click handlers via `onRowClick`. Returning a <TableRow>
// from renderRow breaks the table layout — browsers auto-close the outer
// row before nested rows, and the cells from the nested row end up hoisted
// into the wrong place (only the first cell renders correctly).
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
//     headerAlign={['left', 'center', 'right', /* ... */]}  // optional, defaults to 'left'
//     columnWidths={['180px', '110px', /* ... */]}            // optional, applied to BOTH header and body
//     onRowClick={(item, i) => void}                         // optional row click
//     rowSx={(item, i) => sx}                                // optional per-row sx
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
  // Optional per-column header alignment so headers line up with body cells
  // (e.g. right-aligned "Revenue" header above right-aligned ₹ amounts).
  // Defaults to 'left' for every column.
  headerAlign,
  // Optional per-column widths applied to BOTH the header TableCell and the
  // body cells. Without this, MUI auto-sizes the header row and the body's
  // width/minWidth hints can produce columns where the header text is
  // clipped or misaligned with the data below. Each entry is a CSS width
  // string (e.g. '180px', '12%', 'minmax(120px, 1fr)').
  columnWidths,
  // Optional row-level click handler — fired on each <TableRow>.
  onRowClick,
  // Optional per-row sx — function so rows can use item-specific styling
  // (e.g. highlight the selected state).
  rowSx,
}) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const colWidth = (idx) => (columnWidths?.[idx] ? { width: columnWidths[idx], minWidth: columnWidths[idx] } : {});

  // ---- Desktop: standard MUI Table ----
  if (isMdUp) {
    return (
      // Wrap the table in a horizontally scrollable container so it never
      // overflows its parent. On a 1090px viewport (sidebar 260px + content
      // padding 32px leaves ~798px for the table) a 7-column states page
      // with 1090px of declared widths would otherwise push the rightmost
      // columns off-screen. The user can now scroll right to see them.
      <Box sx={{ overflowX: 'auto', width: '100%' }}>
      <Table sx={{ minWidth: 'max-content' }}>
        <TableHead sx={{ backgroundColor: '#f8f8f8' }}>
          <TableRow>
            {headers.map((h, idx) => (
              <TableCell
                key={h}
                // The `align` prop is the documented way to set the cell's
                // text-align, but MUI's TableCell default stylesheet also
                // applies text-align: left in some themes — leading to the
                // header text being pushed to the wrong edge on certain
                // pages. Force `text-align: left !important` so the header
                // text always sits flush with the cell's content edge, in
                // line with the body cells below.
                align={headerAlign?.[idx] || 'left'}
                sx={{
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  color: 'text.secondary',
                  py: 1.5,
                  px: 2,
                  borderBottom: '2px solid',
                  borderBottomColor: 'divider',
                  whiteSpace: 'nowrap',
                  textAlign: headerAlign?.[idx] || 'left',
                  // Prevent text overflow — if a header is too long for its
                  // column, the `minWidth` on the body cells below will force
                  // the column wider so the header still fits.
                  overflow: 'visible',
                  ...colWidth(idx),
                }}
              >
                {h}
              </TableCell>
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
              <TableRow
                key={rowKey(item, i)}
                hover
                onClick={onRowClick ? () => onRowClick(item, i) : undefined}
                sx={rowSx ? rowSx(item, i) : undefined}
              >
                {renderRow(item, i)}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </Box>
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