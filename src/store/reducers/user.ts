import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { UserProfile } from '../../types/user'

export enum AuthMethod {
  Connect = 'connect',
  ReadOnly = 'readOnly',
  Extension = 'extension',
  Local = 'local',
  OTP = 'otp'
}
export interface IUserAuth {
  method: AuthMethod
  localNsec?: string
}

export interface IUserState {
  auth: IUserAuth | null
  user: UserProfile
}

const initialState: IUserState = {
  auth: null,
  user: {}
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<IUserAuth | null>) {
      state = { ...state, auth: action.payload }
      return state
    },
    setUser(state, action: PayloadAction<UserProfile>) {
      state = { ...state, user: action.payload }
      return state
    }
  }
})

export const { setAuth, setUser } = userSlice.actions

export default userSlice.reducer
