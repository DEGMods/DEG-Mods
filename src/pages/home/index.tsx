import { nip19 } from 'nostr-tools'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useNavigation } from 'react-router-dom'
import { A11y, Autoplay, Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { BlogCard } from '../../components/BlogCard'
import { GameCard } from '../../components/GameCard'
import { ModCard } from '../../components/ModCard'
import { ImageWithFallback } from '../../components/ImageWithFallback'
import { LANDING_PAGE_DATA, PROFILE_BLOG_FILTER_LIMIT } from '../../constants'
import {
  useAppSelector,
  useDidMount,
  useGames,
  useLocalStorage,
  useMuteLists,
  useNDKContext,
  useNSFWList,
  useRepostList
} from '../../hooks'
import { appRoutes, getModPageRoute } from '../../routes'
import { BlogCardDetails, ModDetails, NSFWFilter, SortBy } from '../../types'
import {
  extractBlogCardDetails,
  extractModData,
  handleModImageError,
  log,
  LogType,
  npubToHex
} from '../../utils'

import '../../styles/cardLists.css'
import '../../styles/SimpleSlider.css'
import '../../styles/styles.css'

// Import Swiper styles
import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { Spinner } from 'components/Spinner'
import { isInWoT } from 'utils/wot'

export const HomePage = () => {
  const navigate = useNavigate()
  const games = useGames()

  const featuredGames = useMemo(() => {
    return games.filter((game) =>
      LANDING_PAGE_DATA.featuredGames.includes(game['Game Name'])
    )
  }, [games])

  return (
    <div className="InnerBodyMain">
      <div className="SliderWrapper">
        <div className="ContainerMain">
          <div className="IBMSecMain">
            <div className="simple-slider IBMSMSlider">
              <Swiper
                className="swiper-container IBMSMSliderContainer"
                wrapperClass="swiper-wrapper IBMSMSliderContainerWrapper"
                modules={[Navigation, Pagination, A11y, Autoplay]}
                pagination={{ clickable: true, dynamicBullets: true }}
                slidesPerView={1}
                autoplay={{ delay: 5000 }}
                speed={1000}
                navigation
                loop
              >
                {LANDING_PAGE_DATA.featuredSlider.map((naddr) => (
                  <SwiperSlide
                    key={naddr}
                    className="swiper-slide IBMSMSliderContainerWrapperSlider"
                  >
                    <SlideContent naddr={naddr} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>
      </div>
      <div className="ContainerMain">
        <div className="IBMSecMainGroup">
          <div className="IBMSecMain IBMSMListWrapper">
            <div className="IBMSMTitleMain">
              <h2 className="IBMSMTitleMainHeading">Cool Games</h2>
            </div>
            <div className="IBMSMList IBMSMListFeaturedAlt">
              {featuredGames.map((game) => (
                <GameCard
                  key={game['Game Name']}
                  title={game['Game Name']}
                  imageUrl={game['Boxart image']}
                />
              ))}
            </div>
            <div className="IBMSMAction">
              <a
                className="btn btnMain IBMSMActionBtn"
                role="button"
                onClick={() => navigate(appRoutes.games)}
              >
                View All
              </a>
            </div>
          </div>
          <div className="IBMSecMain IBMSMListWrapper">
            <div className="IBMSMTitleMain">
              <h2 className="IBMSMTitleMainHeading">Awesome Mods</h2>
            </div>
            <div className="IBMSMList IBMSMListAlt">
              {LANDING_PAGE_DATA.awesomeMods.map((naddr) => (
                <DisplayMod key={naddr} naddr={naddr} />
              ))}
            </div>
            <div className="IBMSMAction">
              <a
                className="btn btnMain IBMSMActionBtn"
                role="button"
                onClick={() => navigate(appRoutes.mods)}
              >
                View All
              </a>
            </div>
          </div>
          <DisplayLatestMods />
          <DisplayLatestBlogs />
        </div>
      </div>
    </div>
  )
}

type SlideContentProps = {
  naddr: string
}

const SlideContent = ({ naddr }: SlideContentProps) => {
  const navigate = useNavigate()
  const { fetchEvent } = useNDKContext()
  const [mod, setMod] = useState<ModDetails>()

  useDidMount(() => {
    const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
    const { identifier, kind, pubkey } = decoded.data

    const ndkFilter: NDKFilter = {
      '#a': [identifier],
      authors: [pubkey],
      kinds: [kind]
    }

    fetchEvent(ndkFilter)
      .then((ndkEvent) => {
        if (ndkEvent) {
          const extracted = extractModData(ndkEvent)
          setMod(extracted)
        }
      })
      .catch((err) => {
        log(
          true,
          LogType.Error,
          'An error occurred in fetching mod details from relays',
          err
        )
      })
  })

  if (!mod) return <Spinner />

  return (
    <>
      <ImageWithFallback
        src={mod.featuredImageUrl}
        onError={handleModImageError}
        className="IBMSMSCWSPic"
        prioritizeOriginal={true}
      />
      <div className="IBMSMSCWSInfo">
        <h3 className="IBMSMSCWSInfoHeading">{mod.title}</h3>
        <div className="IBMSMSCWSInfoTextWrapper">
          <p className="IBMSMSCWSInfoText">
            {mod.summary}
            <br />
          </p>
        </div>
        <p className="IBMSMSCWSInfoText IBMSMSCWSInfoText2">
          {mod.game}
          <br />
        </p>
        <div className="IBMSMSliderContainerWrapperSliderAction">
          <a
            className="btn btnMain IBMSMSliderContainerWrapperSliderActionbtn"
            role="button"
            onClick={() => navigate(getModPageRoute(naddr))}
          >
            Check it out
          </a>
        </div>
      </div>
    </>
  )
}

type DisplayModProps = {
  naddr: string
}

const DisplayMod = ({ naddr }: DisplayModProps) => {
  const [mod, setMod] = useState<ModDetails>()

  const { fetchEvent } = useNDKContext()

  useDidMount(() => {
    const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
    const { identifier, kind, pubkey } = decoded.data

    const ndkFilter: NDKFilter = {
      '#a': [identifier],
      authors: [pubkey],
      kinds: [kind]
    }

    fetchEvent(ndkFilter)
      .then((ndkEvent) => {
        if (ndkEvent) {
          const extracted = extractModData(ndkEvent)
          setMod(extracted)
        }
      })
      .catch((err) => {
        log(
          true,
          LogType.Error,
          'An error occurred in fetching mod details from relays',
          err
        )
      })
  })

  if (!mod) return <Spinner />

  return <ModCard {...mod} />
}

const DisplayLatestMods = () => {
  const navigate = useNavigate()
  const { fetchMods } = useNDKContext()
  const { siteWot, siteWotLevel, userWot, userWotLevel } = useAppSelector(
    (state) => state.wot
  )
  const [isFetchingLatestMods, setIsFetchingLatestMods] = useState(true)
  const [latestMods, setLatestMods] = useState<ModDetails[]>([])

  const muteLists = useMuteLists()
  const nsfwList = useNSFWList()
  const repostList = useRepostList()

  useDidMount(() => {
    fetchMods({ source: window.location.host })
      .then((mods) => {
        // Sort by the latest (published_at descending)
        mods.sort((a, b) => b.published_at - a.published_at)
        setLatestMods(mods)
      })
      .finally(() => {
        setIsFetchingLatestMods(false)
      })
  })

  const filteredMods = useMemo(() => {
    const mutedAuthors = [
      ...muteLists.admin.authors,
      ...muteLists.admin.hardBlockedAuthors,
      ...muteLists.admin.illegalBlockedAuthors,
      ...muteLists.user.authors
    ]
    const mutedEvents = [
      ...muteLists.admin.replaceableEvents,
      ...muteLists.admin.hardBlockedEvents,
      ...muteLists.admin.illegalBlockedEvents,
      ...muteLists.user.replaceableEvents
    ]

    const filtered = latestMods.filter(
      (mod) =>
        !mutedAuthors.includes(mod.author) &&
        !mutedEvents.includes(mod.aTag) &&
        !nsfwList.includes(mod.aTag) &&
        !mod.nsfw &&
        isInWoT(siteWot, siteWotLevel, mod.author) &&
        isInWoT(userWot, userWotLevel, mod.author)
    )

    // Add repost tag if missing
    for (let i = 0; i < filtered.length; i++) {
      const mod = filtered[i]
      const isMissingRepostTag =
        !mod.repost && mod.aTag && repostList.includes(mod.aTag)

      if (isMissingRepostTag) {
        mod.repost = true
      }
    }

    return filtered.slice(0, 4)
  }, [
    latestMods,
    muteLists.admin.authors,
    muteLists.admin.hardBlockedAuthors,
    muteLists.admin.illegalBlockedAuthors,
    muteLists.admin.replaceableEvents,
    muteLists.admin.hardBlockedEvents,
    muteLists.admin.illegalBlockedEvents,
    muteLists.user.authors,
    muteLists.user.replaceableEvents,
    nsfwList,
    repostList,
    siteWot,
    siteWotLevel,
    userWot,
    userWotLevel
  ])

  return (
    <div className="IBMSecMain IBMSMListWrapper">
      <div className="IBMSMTitleMain">
        <h2 className="IBMSMTitleMainHeading">Latest Mods</h2>
      </div>
      <div className="IBMSMList">
        {isFetchingLatestMods ? (
          <Spinner />
        ) : (
          filteredMods.map((mod) => {
            return <ModCard key={mod.id} {...mod} />
          })
        )}
      </div>

      <div className="IBMSMAction">
        <a
          className="btn btnMain IBMSMActionBtn"
          role="button"
          onClick={() => navigate(appRoutes.mods)}
        >
          View All
        </a>
      </div>
    </div>
  )
}

const DisplayLatestBlogs = () => {
  const [blogs, setBlogs] = useState<Partial<BlogCardDetails>[]>()
  const { fetchEvents } = useNDKContext()
  const [filterOptions] = useLocalStorage('filter-blog-curated', {
    sort: SortBy.Latest,
    nsfw: NSFWFilter.Hide_NSFW
  })
  const navigation = useNavigation()
  useDidMount(() => {
    const fetchBlogs = async () => {
      try {
        // Show maximum of 4 blog posts
        // 2 should be featured and the most recent 2 from blog npubs
        // Populate the filter from known naddr (constants.ts)
        const filter: NDKFilter = {
          kinds: [NDKKind.Article],
          authors: [],
          '#d': []
        }
        for (let i = 0; i < LANDING_PAGE_DATA.featuredBlogPosts.length; i++) {
          try {
            const naddr = LANDING_PAGE_DATA.featuredBlogPosts[i]
            const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
            const { pubkey, identifier } = decoded.data
            if (!filter.authors?.includes(pubkey)) {
              filter.authors?.push(pubkey)
            }
            if (!filter.authors?.includes(identifier)) {
              filter['#d']?.push(identifier)
            }
          } catch (error) {
            // Silently ignore
          }
        }

        // Prepare filter for the latest
        const blogNpubs = import.meta.env.VITE_BLOG_NPUBS.split(',')
        const blogHexkeys = blogNpubs
          .map(npubToHex)
          .filter((hexkey) => hexkey !== null)

        // We fetch more posts in case of duplicates (from featured)
        const latestFilter: NDKFilter = {
          authors: blogHexkeys,
          kinds: [NDKKind.Article],
          limit: PROFILE_BLOG_FILTER_LIMIT
        }

        // Filter by NSFW tag
        if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
          latestFilter['#L'] = ['content-warning']
        }

        const results = await Promise.allSettled([
          fetchEvents(filter),
          fetchEvents(latestFilter)
        ])

        const events: Partial<BlogCardDetails>[] = []
        // Get featured blogs posts result
        results.forEach((r) => {
          // Add events from both promises to the array
          if (r.status === 'fulfilled' && r.value) {
            events.push(
              ...r.value
                .map(extractBlogCardDetails) // Extract the blog card details
                .sort(
                  // Sort each result by published_at in descending order
                  // We can't sort everything at once we'd lose prefered
                  (a, b) =>
                    a.published_at && b.published_at
                      ? b.published_at - a.published_at
                      : 0
                )
            )
          }
        })

        // Remove duplicates
        const unique = Array.from(
          events
            .filter((b) => b.id)
            .reduce((map, obj) => {
              map.set(obj.id!, obj)
              return map
            }, new Map<string, Partial<BlogCardDetails>>())
            .values()
        ).filter(
          (b) => !(b.nsfw && filterOptions.nsfw === NSFWFilter.Hide_NSFW)
        )

        const latest = unique.slice(0, 4)
        setBlogs(latest)
      } catch (error) {
        log(
          true,
          LogType.Error,
          'An error occurred in fetching blog details from relays',
          error
        )
        return null
      }
    }

    fetchBlogs()
  })

  return (
    <div className="IBMSecMain IBMSMListWrapper">
      {navigation.state !== 'idle' && <LoadingSpinner desc={'Fetching...'} />}
      <div className="IBMSMTitleMain">
        <h2 className="IBMSMTitleMainHeading">Blog Posts</h2>
      </div>
      <div className="IBMSMList">
        {blogs?.map((b) => <BlogCard key={b.id} {...b} />)}
      </div>

      <div className="IBMSMAction">
        <Link
          className="btn btnMain IBMSMActionBtn"
          role="button"
          to={appRoutes.blogs}
        >
          View All
        </Link>
      </div>
    </div>
  )
}
