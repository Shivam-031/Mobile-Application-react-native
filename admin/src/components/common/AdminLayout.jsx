'use client';

// AdminLayout — responsive shell.
//
// ≥ md:    permanent 260px Sidebar (same as before). Content marginLeft 260.
// < md:    AppBar across the top with a hamburger; tapping opens a
//          SwipeableDrawer from the left containing the same Sidebar
//          contents. Content has no left margin; pt = AppBar height.
//
// The Sidebar component is the single source of nav — both shells wrap it.

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Box, AppBar, Toolbar, IconButton, Typography,
  SwipeableDrawer, useMediaQuery, useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar, { NAV_ITEMS } from './Sidebar';

const DRAWER_WIDTH = 260;

export default function AdminLayout({ children }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Best-effort current title for the mobile AppBar.
  const currentNav = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  const mobileTitle = currentNav ? `${currentNav.emoji} ${currentNav.label}` : 'Green Yatra Admin';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F0E8' }}>
      {/* Permanent sidebar on ≥ md */}
      {isMdUp && (
        <Box
          sx={{
            width: DRAWER_WIDTH,
            minHeight: '100vh',
            backgroundColor: '#1A4A2A',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          <Sidebar />
        </Box>
      )}

      {/* Mobile-only AppBar with hamburger */}
      {!isMdUp && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: '#1A4A2A',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Toolbar sx={{ minHeight: 56 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open navigation"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1.5 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 16, color: '#fff', flex: 1 }}>
              {mobileTitle}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* SwipeableDrawer on < md; same Sidebar contents */}
      <SwipeableDrawer
        anchor="left"
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: DRAWER_WIDTH, backgroundColor: '#1A4A2A', color: '#fff' },
        }}
      >
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </SwipeableDrawer>

      {/* Content. Different left margin depending on shell. */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: '100vh',
          // AppBar on mobile is 56px tall — leave a 64px gap so the content
          // doesn't tuck under it. On md+ there's no AppBar.
          marginLeft: { xs: 0, md: `${DRAWER_WIDTH}px` },
          padding: { xs: '72px 12px 16px', md: 3 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}