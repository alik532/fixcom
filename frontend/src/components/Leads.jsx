import React from 'react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'

const Leads = () => {

    const [params] = useSearchParams()

    const query = params.get('query')
    
    const [leads, setLeads] = useState([])

    useEffect(() => {
        if (leads.length === 0) {
            if (query) {
                axios.get(`http://localhost:3000/api/leads?query=${query}`).then(response => {
                console.log("fetching query leads")
                setLeads(response.data)
                })
            }
            else {
                axios.get('http://localhost:3000/api/leads').then(response => {
                console.log("fetching all leads")
                setLeads(response.data)
                })
            }
        } 
    })

    console.log(leads)

    return (
        <div className='leads'>
            <div className='leadsHeader'>
                <h2 className='headerElement'>Название</h2>
                <h2 className='headerElement'>Статус</h2>
                <h2 className='headerElement'>Ответственный</h2>
                <h2 className='headerElement'>Дата Создания</h2>
                <h2 className='headerElement'>Бюджет</h2>
            </div>
            <div className='leadsList'>
                {leads && leads.map((lead, indx) => 
                    <div className='leadItem' key={indx}>
                        <div className='element'>
                            <h2>{lead.name}</h2>
                        </div>
                        <div className='element'>
                            <h2 className='status'>{lead.status}</h2>
                        </div>
                        <div className='element'>
                            <h2>{lead.responsible}</h2>
                        </div>
                        <div className='element'>
                            <h2>{lead.date}</h2>
                        </div>
                        <div className='element'>
                            <h2>{lead.price} T</h2>
                        </div>
                    </div>
                )}        
            </div>
        </div>
    )
}

export default Leads