import { createBrowserRouter } from 'react-router-dom'
import { NDKContextType } from 'contexts/NDKContext'
import { Layout } from 'layout'
import { SearchPage } from '../pages/search'
import { AboutPage } from '../pages/about'
import { GamesPage } from '../pages/games'
import { HomePage } from '../pages/home'
import { ModsPage } from '../pages/mods'
import { ModPage } from '../pages/mod'
import { modsRouteLoader } from '../pages/mods/loader'
import { modRouteLoader } from '../pages/mod/loader'
import { modRouteAction } from '../pages/mod/action'
import { SubmitModPage } from '../pages/submitMod'
import { ProfilePage } from '../pages/profile'
import { profileRouteLoader } from 'pages/profile/loader'
import { SettingsPage } from '../pages/settings'
import { GamePage } from '../pages/game'
import { NotFoundPage } from '../pages/404'
import { submitModRouteAction } from 'pages/submitMod/action'
import { FeedLayout } from '../layout/feed'
import { FeedPage } from '../pages/feed'
import { feedPageLoader } from 'pages/feed/loader'
import { NotificationsPage } from '../pages/notifications'
import { WritePage } from '../pages/write'
import { writeRouteAction } from '../pages/write/action'
import { BlogsPage } from '../pages/blogs'
import { blogsRouteLoader } from '../pages/blogs/loader'
import { BlogPage } from '../pages/blog'
import { blogRouteLoader } from '../pages/blog/loader'
import { blogRouteAction } from '../pages/blog/action'
import { reportRouteAction } from '../actions/report'
import { BackupPage } from 'pages/backup'
import { SupportersPage } from 'pages/supporters'
import { commentsLoader } from 'loaders/comment'
import { CommentsPopup } from 'components/comment/CommentsPopup'
import { feedPostRouteAction } from 'pages/feed/action'

export const appRoutes = {
  home: '/',
  games: '/games',
  game: '/game/:name',
  mods: '/mods',
  mod: '/mod/:naddr/',
  modReport_actionOnly: '/mod/:naddr/report',
  about: '/about',
  blogs: '/blog',
  blog: '/blog/:naddr/',
  blogEdit: '/blog/:naddr/edit',
  blogReport_actionOnly: '/blog/:naddr/report',
  submitMod: '/submit-mod',
  editMod: '/edit-mod/:naddr',
  write: '/write',
  search: '/search',
  settingsProfile: '/settings-profile',
  settingsRelays: '/settings-relays',
  settingsPreferences: '/settings-preferences',
  settingsAdmin: '/settings-admin',
  profile: '/profile/:nprofile?',
  feed: '/feed',
  note: '/feed/:note',
  notifications: '/notifications',
  backup: '/backup',
  supporters: '/supporters'
}

export const getGamePageRoute = (name: string) =>
  appRoutes.game.replace(':name', name)

export const getModPageRoute = (eventId: string) =>
  appRoutes.mod.replace(':naddr', eventId)

export const getModsEditPageRoute = (eventId: string) =>
  appRoutes.editMod.replace(':naddr', eventId)

export const getBlogPageRoute = (eventId: string) =>
  appRoutes.blog.replace(':naddr', eventId)

export const getProfilePageRoute = (nprofile: string) =>
  appRoutes.profile.replace(':nprofile', nprofile)

export const getFeedNotePageRoute = (note: string) =>
  appRoutes.note.replace(':note', note)

export const routerWithNdkContext = (context: NDKContextType) =>
  createBrowserRouter([
    {
      element: <Layout />,
      children: [
        {
          path: appRoutes.home,
          element: <HomePage />
        },
        {
          path: appRoutes.games,
          element: <GamesPage />
        },
        {
          path: appRoutes.game,
          element: <GamePage />
        },
        {
          path: appRoutes.mods,
          element: <ModsPage />,
          loader: modsRouteLoader(context)
        },
        {
          path: appRoutes.mod,
          element: <ModPage />,
          children: [
            {
              path: ':nevent',
              element: <CommentsPopup />,
              loader: commentsLoader(context)
            }
          ],
          loader: modRouteLoader(context),
          action: modRouteAction(context),
          errorElement: <NotFoundPage title={'Something went wrong.'} />
        },
        {
          path: appRoutes.modReport_actionOnly,
          action: reportRouteAction(context)
        },
        {
          path: appRoutes.about,
          element: <AboutPage />
        },
        {
          path: appRoutes.blogs,
          element: <BlogsPage />,
          loader: blogsRouteLoader(context)
        },
        {
          path: appRoutes.blog,
          element: <BlogPage />,
          children: [
            {
              path: ':nevent',
              element: <CommentsPopup />,
              loader: commentsLoader(context)
            }
          ],
          loader: blogRouteLoader(context),
          action: blogRouteAction(context),
          errorElement: <NotFoundPage title={'Something went wrong.'} />
        },
        {
          path: appRoutes.blogEdit,
          element: <WritePage key='edit' />,
          loader: blogRouteLoader(context),
          action: writeRouteAction(context),
          errorElement: <NotFoundPage title={'Something went wrong.'} />
        },
        {
          path: appRoutes.blogReport_actionOnly,
          action: reportRouteAction(context)
        },
        {
          path: appRoutes.submitMod,
          action: submitModRouteAction(context),
          element: <SubmitModPage key='submit' />,
          errorElement: <NotFoundPage title={'Something went wrong.'} />
        },
        {
          path: appRoutes.editMod,
          loader: modRouteLoader(context),
          action: submitModRouteAction(context),
          element: <SubmitModPage key='edit' />,
          errorElement: <NotFoundPage title={'Something went wrong.'} />
        },
        {
          path: appRoutes.write,
          element: <WritePage key='write' />,
          action: writeRouteAction(context)
        },
        {
          path: appRoutes.search,
          element: <SearchPage />
        },
        {
          path: appRoutes.settingsProfile,
          element: <SettingsPage />
        },
        {
          path: appRoutes.settingsRelays,
          element: <SettingsPage />
        },
        {
          path: appRoutes.settingsPreferences,
          element: <SettingsPage />
        },
        {
          path: appRoutes.settingsAdmin,
          element: <SettingsPage />
        },
        {
          path: appRoutes.profile,
          element: <ProfilePage />,
          loader: profileRouteLoader(context)
        },
        {
          element: <FeedLayout />,
          children: [
            {
              path: appRoutes.feed,
              element: <FeedPage />,
              loader: feedPageLoader(context),
              action: feedPostRouteAction(context),
              children: [
                {
                  path: ':note',
                  element: <CommentsPopup />,
                  loader: commentsLoader(context)
                }
              ]
            },
            {
              path: appRoutes.notifications,
              element: <NotificationsPage />
            }
          ]
        },
        {
          path: appRoutes.backup,
          element: <BackupPage />
        },
        {
          path: appRoutes.supporters,
          element: <SupportersPage />
        },
        {
          path: '*',
          element: <NotFoundPage />
        }
      ]
    }
  ])
