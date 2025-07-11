import { NDKKind } from '@nostr-dev-kit/ndk'

export const T_TAG_VALUE = 'GameMod'
export const MOD_FILTER_LIMIT = 20
export const LANDING_PAGE_DATA = {
  featuredSlider: [
    'naddr1qvzqqqrkcgpzquuz5nxzzap2c034s8cuv5ayr7gjaxz7d22pgwfh0qpmsesy9eflqp4nxvp5xqer5den8qexzdrrvverzde5xfskxvm9xv6nsvtxx93nvdfnvy6rze3exyex2wfcx4jnvcfexscngveexvmnwwpsxd3rsd3kxq6ryef4xdnr5cek8pnrwc34xgknyv33xqkngc34xyknscfjxsknzvp38quxgc33vejnqvqhqecq8',
    'naddr1qvzqqqrkcgpzquuz5nxzzap2c034s8cuv5ayr7gjaxz7d22pgwfh0qpmsesy9eflqp4nxvp5xqer5den8qexzdrrvverzde5xfskxvm9xv6nsvtxx93nvdfnvy6rze3exyex2wfcx4jnvcfexscngveexvmnwwpsxd3rsd3kxq6ryef4xdnr5vpcxs6nwwp3x5knyd3evckngetxxcknjdfkx5kngdfhvgukvwfjxsunseqnend73',
    'naddr1qvzqqqrkcgpzquuz5nxzzap2c034s8cuv5ayr7gjaxz7d22pgwfh0qpmsesy9eflqp4nxvp5xqer5den8qexzdrrvverzde5xfskxvm9xv6nsvtxx93nvdfnvy6rze3exyex2wfcx4jnvcfexscngveexvmnwwpsxd3rsd3kxq6ryef4xdnr5d3excenzvf5xgkkvdny8qkngveex5knjcnxxqkn2efnx3jrxvpcxgukxdggsmal6',
    'naddr1qvzqqqrkcgpzquuz5nxzzap2c034s8cuv5ayr7gjaxz7d22pgwfh0qpmsesy9eflqp4nxvp5xqer5den8qexzdrrvverzde5xfskxvm9xv6nsvtxx93nvdfnvy6rze3exyex2wfcx4jnvcfexscngveexvmnwwpsxd3rsd3kxq6ryef4xdnr5dp4xsex2e3cxuknsdryvvkngc3sxcknjef4vcknvvmyvcukyd3kvd3rxdgnuver5',
    'naddr1qvzqqqrkcgpzquuz5nxzzap2c034s8cuv5ayr7gjaxz7d22pgwfh0qpmsesy9eflqp4nxvp5xqer5den8qexzdrrvverzde5xfskxvm9xv6nsvtxx93nvdfnvy6rze3exyex2wfcx4jnvcfexscngveexvmnwwpsxd3rsd3kxq6ryef4xdnr5vf5x9nrxcekxvknjvmzxvkngcfsx5kkzcf3xqknsvmrvgenwe3j8p3nzwgka59vj',
    'naddr1qvzqqqrkcgpzph2jv2ejvdk27hn36dt57j6f69f5h0zccve3xceujq5z9jk8ym8wqp4nxvp5xqer5eryx5ervvnzxvervvekvdskvdt9xuckgve4xu6xvdrzxsukgvf4xv6xycnrx5uxxvenxvcnxd3nxd3njvpj8qerycmpvvmnydnrv4jn5wrpv5mrvwpsxgknxwp4xqkngetpxqknjd35xcknsv3cv9jnxvtp8ycxyegq5ndhc'
  ],
  awesomeMods: [
    'naddr1qvzqqqrkcgpzquuz5nxzzap2c034s8cuv5ayr7gjaxz7d22pgwfh0qpmsesy9eflqp4nxvp5xqer5den8qexzdrrvverzde5xfskxvm9xv6nsvtxx93nvdfnvy6rze3exyex2wfcx4jnvcfexscngveexvmnwwpsxd3rsd3kxq6ryef4xdnr5d3excenzvf5xgkkvdny8qkngveex5knjcnxxqkn2efnx3jrxvpcxgukxdggsmal6',
    'naddr1qvzqqqrkcgpzquuz5nxzzap2c034s8cuv5ayr7gjaxz7d22pgwfh0qpmsesy9eflqp4nxvp5xqer5den8qexzdrrvverzde5xfskxvm9xv6nsvtxx93nvdfnvy6rze3exyex2wfcx4jnvcfexscngveexvmnwwpsxd3rsd3kxq6ryef4xdnr5df5xccngvtrxqkkydpexukngvp4xgknsvp4vskkgdrxvgmkxdmp8quxycgx78rpf',
    'naddr1qvzqqqrkcgpzquuz5nxzzap2c034s8cuv5ayr7gjaxz7d22pgwfh0qpmsesy9eflqp4nxvp5xqer5den8qexzdrrvverzde5xfskxvm9xv6nsvtxx93nvdfnvy6rze3exyex2wfcx4jnvcfexscngveexvmnwwpsxd3rsd3kxq6ryef4xdnr5vrrvgmnjc33xuknwde4vskngvekxgknsenyxvkk2ctxvscrvenpvsmnxeqydygjx'
  ],
  featuredGames: [
    'Persona 3 Reload',
    "Baldur's Gate 3",
    'Cyberpunk 2077',
    'ELDEN RING',
    'The Coffin of Andy and Leyley'
  ],
  featuredBlogPosts: [
    'naddr1qvzqqqr4gupzpa9lr76m4zlg88mscue3wvlrp8mcpq3txy0k8cqlnhy2hw6z37x4qqjrzcfc8qurjefn943xyen9956rywp595unjc3h94nxvwfexymxxcfnvdjxxlyq37c',
    'naddr1qvzqqqr4gupzpa9lr76m4zlg88mscue3wvlrp8mcpq3txy0k8cqlnhy2hw6z37x4qqjryv3k8qenydpj94nrscmp956xgwtp94snydtz95ekgvphvfnxvvrzvyexzsvsz9y',
    'naddr1qvzqqqr4gupzpa9lr76m4zlg88mscue3wvlrp8mcpq3txy0k8cqlnhy2hw6z37x4qyv8wumn8ghj7un9d3shjtnyv4nk6mmywvhxxmmd9uq3wamnwvaz7tmjv4kxz7fwdehhxarj9e3xzmny9uq3qamnwvaz7tmwdaehgu3wd4hk6tcppemhxue69uhkummn9ekx7mp0qy2hwumn8ghj7un9d3shjtnyv9kh2uewd9hj7qgawaehxw309ahx7um5wghxy6t5vdhkjmn9wgh8xmmrd9skctcpz4mhxue69uhkummnw3ezummcw3ezuer9wchsqfrxv33rvvfjxucz6d33vgcz6dp48qej6wryv9jz6errv33nqef3xy6kxvmrtmq496',
    'naddr1qvzqqqr4gupzpa9lr76m4zlg88mscue3wvlrp8mcpq3txy0k8cqlnhy2hw6z37x4qqjrycf5vyunyd34943kydn9956rycmp943xydpc95cxge3cvguxgcmyxsmkyzpyj60'
  ]
}
// we use this object to check if a user has reacted positively or negatively to a post
// reactions are kind 7 events and their content is either emoji icon or emoji shortcode
// Extend the following object as per need to include more emojis and shortcodes
// NOTE: In following object emojis and shortcode array are not interlinked.
// Both of these arrays can have separate items
export const REACTIONS = {
  positive: {
    emojis: [
      '+',
      '❤️',
      '💙',
      '💖',
      '💚',
      '⭐',
      '🚀',
      '🫂',
      '🎉',
      '🥳',
      '🎊',
      '👍',
      '💪',
      '😎'
    ],
    shortCodes: [
      ':red_heart:',
      ':blue_heart:',
      ':sparkling_heart:',
      ':green_heart:',
      ':star:',
      ':rocket:',
      ':people_hugging:',
      ':party_popper:',
      ':tada:',
      ':partying_face:',
      ':confetti_ball:',
      ':thumbs_up:',
      ':+1:',
      ':thumbsup:',
      ':thumbup:',
      ':flexed_biceps:',
      ':muscle:'
    ]
  },
  negative: {
    emojis: [
      '-',
      '💩',
      '💔',
      '👎',
      '😠',
      '😞',
      '🤬',
      '🤢',
      '🤮',
      '🖕',
      '😡',
      '💢',
      '😠',
      '💀'
    ],
    shortCodes: [
      ':poop:',
      ':shit:',
      ':poo:',
      ':hankey:',
      ':pile_of_poo:',
      ':broken_heart:',
      ':thumbsdown:',
      ':thumbdown:',
      ':nauseated_face:',
      ':sick:',
      ':face_vomiting:',
      ':vomiting_face:',
      ':face_with_open_mouth_vomiting:',
      ':middle_finger:',
      ':rage:',
      ':anger:',
      ':anger_symbol:',
      ':angry_face:',
      ':angry:',
      ':smiling_face_with_sunglasses:',
      ':sunglasses:',
      ':skull:',
      ':skeleton:'
    ]
  }
}

export const MAX_MODS_PER_PAGE = 10
export const MAX_GAMES_PER_PAGE = 10
// todo:  add game and  mod fallback image here
export const FALLBACK_PROFILE_IMAGE =
  'https://image.nostr.build/a305f4b43f74af3c6dcda42e6a798105a56ac1e3e7b74d7bef171896b3ba7520.png'

export const PROFILE_BLOG_FILTER_LIMIT = 20
export const MAX_VISIBLE_TEXT_PER_COMMENT = 500
export const CLIENT_NAME_VALUE = 'DEG Mods'
export const CLIENT_TAG_VALUE =
  '31990:f4bf1fb5ba8be839f70c7331733e309f780822b311f63e01f9dc8abbb428f8d5:bf1987d6-b772-43c6-bce7-42b638a9ffed'

export const SERVER_URL_STORAGE_KEY = 'serverUrl'
export const HARD_BLOCK_TAG = 'hard-blocks'
export const HARD_BLOCK_LIST_KIND = 31000 as NDKKind
