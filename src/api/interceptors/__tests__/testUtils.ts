import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

export type RequestFulfilled = (config: AxiosRequestConfig) => AxiosRequestConfig

export type RequestRejected = (error: unknown) => Promise<never>

export type ResponseFulfilled = (response: AxiosResponse) => AxiosResponse

export type ResponseRejected = (error: AxiosError) => Promise<unknown>

export type RequestUse = (onFulfilled: RequestFulfilled, onRejected: RequestRejected) => number

export type ResponseUse = (onFulfilled: ResponseFulfilled, onRejected: ResponseRejected) => number
