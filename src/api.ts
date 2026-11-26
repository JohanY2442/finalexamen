import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useEffect, useState } from "react";


export const API_URL = "https://bibliotecaactiva-api.aaron-navarro.workers.dev"

export const api = axios.create({baseURL: API_URL + "/api", timeout:10000});

export type ApiError = {code?:string; message?:string};

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');

        if (token && config.headers && !config.url?.startsWith("/auth")){
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error:AxiosError) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response:any) => response,
    (error: AxiosError <ApiError>) => {
        if (error.response?.status===401 && !error.config?.url?.startsWith("/auth")){
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);


export type AppError = {status:number; code:string; message:string};

const STATUS_MSG: Record<number,string> = {
    400: "Revisa los datos ingresados. Falta el correo o la contraseña",
    404: "No se encontro el registro.",
    409: "El material ya no tiene ejemplares disponibles.",
    500: "Error del servidor. Intentalo de nuevo en un momento.",
};

export function apiError(err:unknown):AppError{
    if (axios.isAxiosError(err) && err.response) {
        const {status, data} = err.response;
        return {status, code:data?.code??'', message:data?.message || STATUS_MSG[status] || `Error ${status}`};
    }
    return {status:0,code:"NETWORK", message:"No se pudo conectar con el servidor. Revisa tu conexion"};
}

export function useFetch<T>(url:string | null) {
    const [data, setData] = useState<T|null>(null);
    const [loading, setLoading]= useState(url !==null);
    const [error, setError] = useState("");
    const [version, setVersion] = useState(0);

    useEffect (() => {
        if (url === null) return ;
        let ignore = false;
        setLoading(true);
        setError("");
        api.get<T>(url)
            .then ((res) => {if (!ignore)setData (res.data);})
            .catch((err) => {if (!ignore)setError(apiError(err).message);})
            .finally(()=>{if (!ignore)setLoading(false);});        

    },[url,version]);

    return {data, setData, loading, error, reaload: ()=> setVersion( (v) => v+1)};
}

