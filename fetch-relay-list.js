#!/usr/bin/env node

/**
 * Simple script to fetch all kind 10002 events (relay lists) from Nostr relays
 *
 * Usage:
 *   node fetch-relay-list.js
 *
 * This script will connect to relays and display all kind 10002 events (NIP-65 relay lists)
 */

/* global process */

import NDK from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'

/**
 * Timeout utility function
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
const timeout = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  })
}

/**
 * Parse a kind 10002 event to extract relay information
 * @param {NDKEvent} event - The kind 10002 event to parse
 * @returns {Object} Parsed relay information
 */
const parseRelayListEvent = (event) => {
  const relayInfo = {
    pubkey: event.pubkey,
    npub: nip19.npubEncode(event.pubkey),
    createdAt: new Date(event.created_at * 1000).toISOString(),
    readRelays: [],
    writeRelays: [],
    bothRelays: []
  }

  // Parse tags to extract relay information
  event.tags.forEach((tag) => {
    if (tag[0] === 'r' && tag[1]) {
      const relayUrl = tag[1]
      const relayType = tag[2]

      if (!relayType || relayType === '') {
        // No type specified means both read and write
        relayInfo.bothRelays.push(relayUrl)
      } else if (relayType === 'read') {
        relayInfo.readRelays.push(relayUrl)
      } else if (relayType === 'write') {
        relayInfo.writeRelays.push(relayUrl)
      }
    }
  })

  return relayInfo
}

/**
 * Fetch and display all kind 10002 events (relay lists) from the relays
 */
const fetchAllRelayListEvents = async () => {
  console.log('🔍 Fetching all kind 10002 events (relay lists) from relays...')

  // Initialize NDK with some default relays
  const ndk = new NDK({
    explicitRelayUrls: [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.band',
      'wss://purplepag.es',
      'wss://user.kindpag.es',
      'wss://relay.degmods.com',
      'wss://nostr.land/',
      'wss://relay.snort.social/'
    ],
    // Add some connection options to make it more reliable
    autoConnectUserRelays: false,
    autoFetchUserMutelist: false
  })

  try {
    console.log('🔌 Connecting to Nostr relays...')

    // Start connection
    ndk.connect()

    // Wait for at least one relay to connect
    let connected = false
    const maxWaitTime = 8000 // 8 seconds
    const checkInterval = 500 // Check every 500ms
    let waitTime = 0

    while (!connected && waitTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval))
      waitTime += checkInterval

      const connectedRelays = Array.from(ndk.pool.relays.values()).filter(
        (relay) => relay.connectivity.status === 1
      ) // 1 = connected

      if (connectedRelays.length > 0) {
        connected = true
        console.log(
          `✅ Connected to ${connectedRelays.length} out of ${ndk.pool.relays.size} relays`
        )
      }
    }

    if (!connected) {
      throw new Error('Failed to connect to any relays within timeout period')
    }

    // Give a moment for relays to be ready
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('📡 Subscribing to kind 10002 events...')

    // Create filter for kind 10002 events (relay lists)
    const filter = {
      kinds: [10002],
      limit: 500 // Increased limit to catch more events
    }

    console.log('🔍 Filter:', JSON.stringify(filter, null, 2))

    // Create subscription
    const subscription = ndk.subscribe(filter)
    const events = []

    // Set up event handler
    subscription.on('event', (event) => {
      events.push(event)
      console.log(`📥 Received event from ${event.pubkey.substring(0, 8)}...`)
    })

    // Set up end of stream handler
    subscription.on('eose', () => {
      console.log('🏁 End of stored events reached')
    })

    // Wait for events with timeout
    await Promise.race([
      new Promise((resolve) => {
        // Wait for some events to come in, then resolve
        setTimeout(() => {
          subscription.stop()
          resolve()
        }, 10000) // 10 second timeout
      }),
      timeout(15000) // 15 second timeout
    ])

    if (events.length > 0) {
      console.log(`\n📋 Found ${events.length} kind 10002 events:`)
      console.log('='.repeat(80))

      events.forEach((event, index) => {
        const relayInfo = parseRelayListEvent(event)

        console.log(`\n${index + 1}. Event from: ${relayInfo.npub}`)
        console.log(`   Created: ${relayInfo.createdAt}`)
        console.log(`   Pubkey: ${relayInfo.pubkey}`)

        // Display read relays
        if (relayInfo.readRelays.length > 0) {
          console.log('   📖 Read Relays:')
          relayInfo.readRelays.forEach((url) => {
            console.log(`      - ${url}`)
          })
        }

        // Display write relays
        if (relayInfo.writeRelays.length > 0) {
          console.log('   ✍️  Write Relays:')
          relayInfo.writeRelays.forEach((url) => {
            console.log(`      - ${url}`)
          })
        }

        // Display both (read/write) relays
        if (relayInfo.bothRelays.length > 0) {
          console.log('   🔄 Read/Write Relays:')
          relayInfo.bothRelays.forEach((url) => {
            console.log(`      - ${url}`)
          })
        }

        const totalRelays =
          relayInfo.readRelays.length +
          relayInfo.writeRelays.length +
          relayInfo.bothRelays.length
        console.log(`   📊 Total relays: ${totalRelays}`)
      })

      // Summary statistics
      const allRelayUrls = new Set()
      const userCount = events.length

      events.forEach((event) => {
        const relayInfo = parseRelayListEvent(event)
        relayInfo.readRelays.forEach((url) => allRelayUrls.add(url))
        relayInfo.writeRelays.forEach((url) => allRelayUrls.add(url))
        relayInfo.bothRelays.forEach((url) => allRelayUrls.add(url))
      })

      console.log('\n📊 Summary Statistics:')
      console.log('='.repeat(50))
      console.log(`👥 Users with relay lists: ${userCount}`)
      console.log(`🌐 Unique relay URLs found: ${allRelayUrls.size}`)

      if (allRelayUrls.size > 0) {
        console.log('\n🔗 All Unique Relay URLs:')
        Array.from(allRelayUrls)
          .sort()
          .forEach((url, index) => {
            console.log(`  ${index + 1}. ${url}`)
          })
      }
    } else {
      console.log('❌ No kind 10002 events found')
      console.log('💡 This could mean:')
      console.log('   - No users have published relay lists to these relays')
      console.log('   - The relays might not store kind 10002 events')
      console.log('   - Network connectivity issues')
    }
  } catch (error) {
    console.error('❌ Error fetching kind 10002 events:', error.message)

    if (error.message.includes('timed out')) {
      console.log('💡 Try again later or check network connectivity')
    }
  } finally {
    // Clean up NDK connections
    console.log('\n🔌 Disconnecting from relays...')
    // NDK doesn't have an explicit disconnect method, connections will close automatically
    process.exit(0)
  }
}

/**
 * Main function to handle command line arguments and run the script
 */
const main = () => {
  const args = process.argv.slice(2)

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log('📖 Usage: node fetch-relay-list.js [options]')
    console.log('')
    console.log('📝 Description:')
    console.log(
      '   This script fetches all kind 10002 events (NIP-65 relay lists) from Nostr relays'
    )
    console.log('')
    console.log('🔧 Options:')
    console.log('   --help, -h    Show this help message')
    console.log('')
    console.log(
      'ℹ️  The script will connect to multiple relays and display all relay list events'
    )
    process.exit(0)
  }

  console.log('🚀 Starting kind 10002 event fetcher...')
  console.log('ℹ️  This will fetch all relay list events from connected relays')
  console.log('')

  fetchAllRelayListEvents()
}

// Run the script
main()
