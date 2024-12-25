import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export enum WOTStatus {
  IDLE, // Not started
  LOADING, // Currently loading
  LOADED, // Successfully loaded
  FAILED // Failed to load
}

export interface IWOT {
  siteWot: Record<string, number>
  siteWotStatus: WOTStatus
  siteWotLevel: number
  userWot: Record<string, number>
  userWotStatus: WOTStatus
  userWotLevel: number
}

const initialState: IWOT = {
  siteWot: {},
  siteWotStatus: WOTStatus.IDLE,
  siteWotLevel: 0,
  userWot: {},
  userWotStatus: WOTStatus.IDLE,
  userWotLevel: 0
}

export const wotSlice = createSlice({
  name: 'wot',
  initialState,
  reducers: {
    setSiteWot(state, action: PayloadAction<Record<string, number>>) {
      state.siteWot = action.payload
      state.siteWotStatus = WOTStatus.LOADED
    },
    setUserWot(state, action: PayloadAction<Record<string, number>>) {
      state.userWot = action.payload
      state.userWotStatus = WOTStatus.LOADED
    },
    resetUserWot(state) {
      state.userWot = {}
      state.userWotStatus = WOTStatus.IDLE
      state.userWotLevel = 0
    },
    setSiteWotStatus(state, action: PayloadAction<WOTStatus>) {
      state.siteWotStatus = action.payload
    },
    setUserWotStatus(state, action: PayloadAction<WOTStatus>) {
      state.userWotStatus = action.payload
    },
    setSiteWotLevel(state, action: PayloadAction<number>) {
      state.siteWotLevel = action.payload
    },
    setUserWotLevel(state, action: PayloadAction<number>) {
      state.userWotLevel = action.payload
    }
  }
})

export const {
  setSiteWot,
  setUserWot,
  setSiteWotStatus,
  setUserWotStatus,
  setSiteWotLevel,
  setUserWotLevel,
  resetUserWot
} = wotSlice.actions

export default wotSlice.reducer
